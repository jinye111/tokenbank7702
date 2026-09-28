import { useCallback, useEffect, useState } from "react";
import { encodeFunctionData, formatEther, parseEther } from "viem";
import type { Address } from "viem";
import { ERC20_ABI, TOKEN_BANK_ABI } from "../abis";
import { publicClient } from "../clients";
import { BANK_ADDRESS, TOKEN_ADDRESS } from "../config";
import { buildDepositBatch } from "../lib/tokenBank";
import {
  getChainId,
  sendCalls,
  sendTransaction,
  waitForBatch,
  waitForTransaction,
} from "../lib/wallet";

export function useTokenBank(account: Address | null) {
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [bankBalance, setBankBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [symbol, setSymbol] = useState("");
  const [bankToken, setBankToken] = useState("");
  const [tokenHasCode, setTokenHasCode] = useState<boolean | null>(null);
  const [bankHasCode, setBankHasCode] = useState<boolean | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const refreshBalances = useCallback(async () => {
    if (!account) return;
    try {
      const [tCode, bCode] = await Promise.all([
        publicClient.getCode({ address: TOKEN_ADDRESS }),
        publicClient.getCode({ address: BANK_ADDRESS }),
      ]);
      setTokenHasCode(Boolean(tCode) && tCode !== "0x");
      setBankHasCode(Boolean(bCode) && bCode !== "0x");

      const [bal, dep, allow, sym, bankTok] = await Promise.all([
        publicClient.readContract({
          address: TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account],
        }),
        publicClient.readContract({
          address: BANK_ADDRESS,
          abi: TOKEN_BANK_ABI,
          functionName: "balanceOf",
          args: [account],
        }),
        publicClient.readContract({
          address: TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [account, BANK_ADDRESS],
        }),
        publicClient.readContract({
          address: TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: BANK_ADDRESS,
          abi: TOKEN_BANK_ABI,
          functionName: "token",
        }),
      ]);
      setTokenBalance(bal);
      setBankBalance(dep);
      setAllowance(allow);
      setSymbol(sym);
      setBankToken(bankTok);
    } catch (err) {
      console.error("查询余额失败:", err);
    }
  }, [account]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

  const deposit = useCallback(
    async (amount: string) => {
      if (!account) return;
      setDepositing(true);
      setError("");
      setTxHash("");
      try {
        const chainId = (await getChainId()) as `0x${string}`;
        const calls = buildDepositBatch(amount);
        const batchId = await sendCalls({
          version: "2.0.0",
          from: account,
          calls,
          atomicRequired: true,
          chainId,
        });
        const result = await waitForBatch(batchId);
        const hash = result.receipts?.[0]?.transactionHash;
        if (hash) setTxHash(hash);
        await refreshBalances();
      } catch (err) {
        const e = err as { code?: number | string; message?: string };
        setError(`[${e?.code ?? "unknown"}] ${e?.message ?? String(err)}`);
      } finally {
        setDepositing(false);
      }
    },
    [account, refreshBalances],
  );

  // 诊断 / 兜底：用两笔普通交易完成存款（不走 EIP-7702）
  const depositTwoStep = useCallback(
    async (amount: string) => {
      if (!account) return;
      setDepositing(true);
      setError("");
      setTxHash("");
      try {
        const value = parseEther(amount);
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [BANK_ADDRESS, value],
        });
        const depositData = encodeFunctionData({
          abi: TOKEN_BANK_ABI,
          functionName: "deposit",
          args: [value],
        });

        const h1 = await sendTransaction({
          from: account,
          to: TOKEN_ADDRESS,
          data: approveData,
        });
        await waitForTransaction(h1);

        const h2 = await sendTransaction({
          from: account,
          to: BANK_ADDRESS,
          data: depositData,
        });
        await waitForTransaction(h2);

        setTxHash(h2);
        await refreshBalances();
      } catch (err) {
        const e = err as { code?: number | string; message?: string };
        setError(
          `[两步] [${e?.code ?? "unknown"}] ${e?.message ?? String(err)}`,
        );
      } finally {
        setDepositing(false);
      }
    },
    [account, refreshBalances],
  );

  return {
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
    refreshBalances,
    formatBalance: (v: bigint | null) =>
      v == null ? "—" : formatEther(v),
  };
}
