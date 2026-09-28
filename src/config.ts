import type { Address, Hex } from "viem";

// ============ 网络配置 ============
// Sepolia 测试网（EIP-7702 已激活，MetaMask 官方 Delegator 已部署）
// RPC 仅用于读取余额，不参与交易签名。
export const CHAIN_ID = 11155111; // Sepolia
export const RPC_URL =
  (import.meta.env.VITE_RPC_URL as string | undefined) ??
  "https://ethereum-sepolia-rpc.publicnode.com";

// Sepolia 区块浏览器（用于展示交易链接）
export const BLOCK_EXPLORER = "https://sepolia.etherscan.io";

// ============ MetaMask 官方 EIP-7702 Delegator ============
// 这是 MetaMask 官方的智能账户实现合约。EOA 通过 EIP-7702
// 把代码委托给该合约后，即可用 wallet_sendCalls 在一笔交易里
// 原子地批量执行多笔调用（approve + deposit）。
export const DELEGATOR_ADDRESS: Address =
  "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B";

// ============ 你的业务合约地址（部署后替换） ============
// 对应你贴出的合约：ExtendedERC20（代币）与 TokenBank（银行）。
export const TOKEN_ADDRESS: Address =
  (import.meta.env.VITE_TOKEN_ADDRESS as Address | undefined) ??
  "0xBC28EAb0Ed0be2304Be2FbBb8506De239C2c76a9";

export const BANK_ADDRESS: Address =
  (import.meta.env.VITE_BANK_ADDRESS as Address | undefined) ??
  "0x93a5c585C80DC34606cc9C1Ba6f40BBCc85Cd6B2";

export const ZERO_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

// EIP-5792 sendCalls 的 chainId 参数
export const CHAIN_ID_HEX: Hex = `0x${CHAIN_ID.toString(16)}`;
