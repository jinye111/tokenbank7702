# TokenBank · EIP-7702 前端

一个演示「一笔交易完成存款」的前端页面，配合你已有的 `TokenBank` / `ExtendedERC20` 合约。

核心思路：

- 使用 MetaMask 官方的 **EIP-7702 Delegator** 合约
  `0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B`（即 EOA 委托代码所指向的智能账户实现）。
- 通过 **EIP-5792 `wallet_sendCalls`** 的 `atomicBatch` 能力，把
  `approve` 和 `deposit` 两笔调用合并成**一笔原子交易**。

> 注意：EIP-7702 需要链上已激活 Pectra 升级，且 MetaMask 开启智能账户功能。
> 建议在 **Sepolia** 测试网运行。

## 前置条件

1. 部署你的 `ExtendedERC20` 和 `TokenBank` 合约，记录两个地址。
2. MetaMask 已连接 Sepolia，并开启 EIP-7702 / 智能账户功能。
3. 账户里有 Sepolia ETH（支付 gas）和测试代币（用于存款）。

## 配置合约地址

方式一：复制 `.env.example` 为 `.env`，填入地址：

```bash
cp .env.example .env
```

```env
VITE_TOKEN_ADDRESS=0x你的代币合约地址
VITE_BANK_ADDRESS=0x你的银行合约地址
```

方式二：直接修改 `src/config.ts` 里的 `TOKEN_ADDRESS` 和 `BANK_ADDRESS`。

## 运行

```bash
npm install
npm run dev
```

打开终端提示的本地地址（默认 `http://localhost:5173`），连接钱包后输入金额点击「一键存款」。

## 工作流程

1. 点击「连接 MetaMask」。
2. 页面会检查钱包是否支持 `atomicBatch`，并读取 EOA 是否已通过 EIP-7702
   委托到官方 Delegator（`eth_getCode` 返回 `0xef0100...` 即已委托）。
3. 输入金额，点击「一键存款」。
4. 前端调用 `wallet_sendCalls`，提交两笔调用：
   - `token.approve(bank, amount)`
   - `bank.deposit(amount)`
5. MetaMask 在**一笔交易**中原子执行这两笔调用，页面轮询
   `wallet_getCallsStatus` 直到确认，并展示交易链接。

## 目录结构

```
src/
  config.ts          # 网络、Delegator、业务合约地址
  abis.ts            # ERC20 / TokenBank 最小 ABI
  clients.ts         # viem 只读 client
  ethereum.d.ts      # window.ethereum 与 EIP-5792 类型
  lib/
    wallet.ts        # connect / capabilities / sendCalls / getCallsStatus
    tokenBank.ts     # 组装 approve + deposit 批量调用
  hooks/
    useWallet.ts     # 钱包连接与能力检测
    useTokenBank.ts  # 余额查询与存款
  App.tsx            # 页面 UI
```
