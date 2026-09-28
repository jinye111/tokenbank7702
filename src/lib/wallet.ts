import type { Address } from "viem";
import { DELEGATOR_ADDRESS } from "../config";
import type {
  CallsStatusResult,
  SendCallsParams,
} from "../ethereum";

export function getProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("未检测到 MetaMask，请先安装并登录 MetaMask 扩展");
  }
  return window.ethereum;
}

export async function connect(): Promise<Address> {
  const provider = getProvider();
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
    params: [],
  })) as string[];
  if (!accounts.length) throw new Error("用户拒绝了连接请求");
  return accounts[0] as Address;
}

export async function getChainId(): Promise<string> {
  const provider = getProvider();
  return (await provider.request({
    method: "eth_chainId",
    params: [],
  })) as string;
}

// 检查钱包是否支持 EIP-5792 sendCalls 的原子批量（atomicBatch）能力
export async function supportsAtomicBatch(
  account?: Address,
  chainIdHex?: string,
): Promise<{ supported: boolean; raw: Record<string, unknown> }> {
  const provider = getProvider();
  try {
    const caps = (await provider.request({
      method: "wallet_getCapabilities",
      params: account ? [account] : [],
    })) as Record<
      string,
      { atomicBatch?: { supported?: boolean } } | undefined
    >;

    // 打印原始返回，方便排查 MetaMask 版本差异
    console.log("[wallet_getCapabilities]", caps);

    const hasAtomic = (c?: {
      atomicBatch?: { supported?: boolean };
    }) => c?.atomicBatch?.supported === true;

    if (chainIdHex) {
      return { supported: hasAtomic(caps[chainIdHex]), raw: caps };
    }
    return {
      supported: Object.values(caps).some(hasAtomic),
      raw: caps,
    };
  } catch (err) {
    console.error("[wallet_getCapabilities] 调用失败:", err);
    const e = err as { code?: number | string; message?: string };
    return {
      supported: false,
      raw: {
        error: e?.message ?? String(err),
        code: e?.code ?? null,
      },
    };
  }
}

// 检查 EOA 是否已通过 EIP-7702 委托到 MetaMask 官方 Delegator。
// 委托指示符为 0xef0100 + 20 字节地址。
export async function isDelegatedToOfficial(account: Address): Promise<boolean> {
  const provider = getProvider();
  const code = (await provider.request({
    method: "eth_getCode",
    params: [account, "latest"],
  })) as string;
  return (
    code.toLowerCase() ===
    `0xef0100${DELEGATOR_ADDRESS.slice(2).toLowerCase()}`
  );
}

export async function sendCalls(params: SendCallsParams): Promise<string> {
  const provider = getProvider();
  try {
    // EIP-5792 v1 返回字符串 id，v2.0.0 返回 { id } 对象，这里统一归一化
    const res = (await provider.request({
      method: "wallet_sendCalls",
      params: [params],
    })) as string | { id?: string };

    const id = typeof res === "string" ? res : res?.id;
    if (!id) {
      throw new Error(
        `wallet_sendCalls 返回格式异常: ${JSON.stringify(res)}`,
      );
    }
    console.log("[wallet_sendCalls] batchId =", id);
    return id;
  } catch (err) {
    const e = err as { code?: number | string; message?: string };
    console.error("[wallet_sendCalls] 调用失败:", err);
    throw new Error(
      `[${e?.code ?? "unknown"}] ${e?.message ?? String(err)}`,
    );
  }
}

export async function getCallsStatus(id: string): Promise<CallsStatusResult> {
  const provider = getProvider();
  try {
    return (await provider.request({
      method: "wallet_getCallsStatus",
      params: [id],
    })) as CallsStatusResult;
  } catch (err) {
    const e = err as { code?: number | string; message?: string };
    console.error("[wallet_getCallsStatus] 调用失败:", err);
    throw new Error(
      `[${e?.code ?? "unknown"}] ${e?.message ?? String(err)}`,
    );
  }
}

// 发送一笔普通交易（用于诊断 / 两步存款）
export async function sendTransaction(params: {
  from: string;
  to: string;
  data: string;
}): Promise<string> {
  const provider = getProvider();
  return (await provider.request({
    method: "eth_sendTransaction",
    params: [params],
  })) as string;
}

export async function waitForTransaction(
  hash: string,
  pollMs = 1500,
  timeoutMs = 120000,
): Promise<void> {
  const provider = getProvider();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as { status?: string } | null;
    if (receipt) {
      if (receipt.status === "0x1") return;
      throw new Error(`交易回滚（status=${String(receipt.status)}）: ${hash}`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`等待交易回执超时: ${hash}`);
}

// 轮询直到批次确认，返回最终状态
export async function waitForBatch(
  id: string,
  pollMs = 1500,
  timeoutMs = 120000,
): Promise<CallsStatusResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getCallsStatus(id);

    console.log("[wallet_getCallsStatus]", JSON.stringify(status));

    // v1 用字符串（"PENDING"/"CONFIRMED"），v2 用数字状态码（100/200/500...）
    const raw = status.status as unknown;
    const isConfirmed = raw === "CONFIRMED" || raw === 200;
    const isFailure =
      raw === "FAILED" || raw === 400 || raw === 500 || raw === 600;

    if (isConfirmed) return status;
    if (isFailure) {
      throw new Error(
        `交易批次执行失败（batchId=${id}, status=${String(
          raw,
        )}）：${JSON.stringify(status)}`,
      );
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error("等待交易确认超时");
}
