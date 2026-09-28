import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { RPC_URL } from "./config";

// 只读客户端：用于查询余额 / 授权额度
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});
