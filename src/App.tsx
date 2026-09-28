import { useState } from "react";
import {
  BANK_ADDRESS,
  BLOCK_EXPLORER,
  DELEGATOR_ADDRESS,
  TOKEN_ADDRESS,
  ZERO_ADDRESS,
} from "./config";
import { useTokenBank } from "./hooks/useTokenBank";
import { useWallet } from "./hooks/useWallet";

const shorten = (addr: string) =>
  addr.length <= 10 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function App() {
  const {
    account,
    chainId,
    supportsAtomic,
    isDelegated,
    loading,
    rawCapabilities,
    connectWallet,
  } = useWallet();
  const {
    tokenBalance,
    bankBalance,
    allowance,
    symbol,
    bankToken,
    tokenHasCode,
    bankHasCode,
    depositing,
    error,
    txHash,
    deposit,
    depositTwoStep,
    formatBalance,
  } = useTokenBank(account);

  const [amount, setAmount] = useState("");
  const needsConfig =
    TOKEN_ADDRESS === ZERO_ADDRESS || BANK_ADDRESS === ZERO_ADDRESS;

  const handleDeposit = () => {
    if (!amount || Number(amount) <= 0) return;
    void deposit(amount);
  };

  // 已委托到官方 Delegator，或钱包报告 atomicBatch 支持，即可用 sendCalls
  const canSendCalls = supportsAtomic || isDelegated;

  // 银行合约绑定的代币地址是否和前端的 TOKEN_ADDRESS 一致
  const tokenMismatch =
    bankToken !== "" &&
    bankToken.toLowerCase() !== TOKEN_ADDRESS.toLowerCase();

  return (
    <div className="page">
      <header className="hero">
        <h1>🏦 TokenBank</h1>
        <p className="subtitle">
          使用 MetaMask 官方 EIP-7702 Delegator + EIP-5792{" "}
          <code>wallet_sendCalls</code> 在一笔交易里完成存款
        </p>
        <div className="hero-actions">
          {!account ? (
            <button
              className="btn primary"
              onClick={() => void connectWallet()}
              disabled={loading}
            >
              {loading ? "连接中..." : "连接 MetaMask"}
            </button>
          ) : (
            <span className="badge connected">
              已连接 {shorten(account)}
            </span>
          )}
        </div>
      </header>

      {needsConfig && (
        <div className="banner warn">
          请先在 <code>src/config.ts</code> 或 <code>.env</code> 中填入你部署的
          TokenBank 与代币合约地址。
        </div>
      )}

      {account && (
        <>
          <section className="grid">
            <div className="card">
              <h2>账户状态</h2>
              <dl className="kv">
                <dt>地址</dt>
                <dd className="mono">{shorten(account)}</dd>
                <dt>链 ID</dt>
                <dd>{chainId ?? "—"}</dd>
                <dt>atomicBatch 能力</dt>
                <dd className={supportsAtomic ? "ok" : "bad"}>
                  {supportsAtomic ? "支持 ✅" : "不支持 ❌"}
                </dd>
                <dt>EIP-7702 委托</dt>
                <dd className={isDelegated ? "ok" : "muted"}>
                  {isDelegated
                    ? "已委托到官方 Delegator ✅"
                    : "未委托（首次 sendCalls 时自动设置）"}
                </dd>
              </dl>
              <p className="hint">
                官方 Delegator：{" "}
                <code className="mono">{shorten(DELEGATOR_ADDRESS)}</code>
              </p>
              <p className="hint">
                wallet_getCapabilities 原始返回：
                <pre className="raw">{rawCapabilities || "（无）"}</pre>
              </p>
            </div>

            <div className="card">
              <h2>余额</h2>
              <dl className="kv">
                <dt>代币余额</dt>
                <dd>
                  {formatBalance(tokenBalance)}
                  {symbol ? ` ${symbol}` : ""}
                </dd>
                <dt>银行存款</dt>
                <dd>{formatBalance(bankBalance)}</dd>
                <dt>已授权额度</dt>
                <dd>{formatBalance(allowance)}</dd>
              </dl>
            </div>
          </section>

          <section className="card deposit-card">
            <h2>💰 一笔交易存款（approve + deposit）</h2>
            <p className="hint">
              常规流程需要先 approve 再 deposit 两笔交易；这里通过{" "}
              <code>wallet_sendCalls</code> 的 atomicBatch 把两步合并为一笔原子交易。
            </p>
            <div className="row">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="存入数量"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <button
                className="btn primary"
                onClick={handleDeposit}
                disabled={depositing || !amount || !canSendCalls}
              >
                {depositing ? "发送中..." : "一键存款"}
              </button>
            </div>

            {!canSendCalls && (
              <div className="banner warn">
                当前钱包不支持 atomicBatch，请确认 MetaMask 已开启 EIP-7702
                智能账户功能（需在支持的测试网如 Sepolia）。
              </div>
            )}

            {tokenMismatch && (
              <div className="banner error">
                地址配置不一致：银行合约里绑定的代币是{" "}
                <code className="mono">{bankToken}</code>，但前端配置的
                TOKEN_ADDRESS 是{" "}
                <code className="mono">{TOKEN_ADDRESS}</code>
                。这会导致 approve 授权错对象，deposit 必然回滚。
              </div>
            )}

            {tokenHasCode === false && (
              <div className="banner error">
                代币地址 <code className="mono">{TOKEN_ADDRESS}</code>{" "}
                在当前链上**没有合约代码**——它很可能只部署在本地 Anvil，
                Sepolia 上并不存在。这样 approve / transferFrom 都会回滚。
              </div>
            )}

            {bankHasCode === false && (
              <div className="banner error">
                银行地址 <code className="mono">{BANK_ADDRESS}</code>{" "}
                在当前链上没有合约代码，说明它不在当前网络。
              </div>
            )}

            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn"
                onClick={() => {
                  if (!amount || Number(amount) <= 0) return;
                  void depositTwoStep(amount);
                }}
                disabled={depositing || !amount}
                title="诊断用：不走 EIP-7702，分两笔普通交易执行 approve + deposit"
              >
                {depositing ? "处理中..." : "诊断：两步普通存款"}
              </button>
            </div>

            {error && <div className="banner error">{error}</div>}
            {txHash && (
              <div className="banner ok">
                存款成功，交易哈希：{" "}
                {BLOCK_EXPLORER ? (
                  <a
                    className="mono link"
                    href={`${BLOCK_EXPLORER}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shorten(txHash)}
                  </a>
                ) : (
                  <code className="mono">{txHash}</code>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
