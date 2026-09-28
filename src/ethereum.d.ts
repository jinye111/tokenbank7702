import type { Address, Hex } from "viem";

// EIP-5792 相关类型定义
export interface EIP5792Call {
  to: Address;
  data?: Hex;
  value?: Hex;
}

export interface SendCallsParams {
  version: string;
  from: Address;
  calls: EIP5792Call[];
  atomicRequired: boolean;
  capabilities?: Record<string, unknown>;
  chainId?: Hex;
}

export interface BatchReceipt {
  transactionHash: Hex;
  status: Hex;
  blockNumber: Hex;
  logs: unknown[];
}

export interface CallsStatusResult {
  status: "PENDING" | "CONFIRMED" | "FAILED" | number;
  receipts?: BatchReceipt[];
}

interface MetaMaskProvider {
  isMetaMask?: boolean;
  request(args: {
    method: string;
    params?: unknown[] | object;
  }): Promise<unknown>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: MetaMaskProvider;
  }
}

export {};
