import { encodeFunctionData, parseEther } from "viem";
import { ERC20_ABI, TOKEN_BANK_ABI } from "../abis";
import { BANK_ADDRESS, TOKEN_ADDRESS } from "../config";
import type { EIP5792Call } from "../ethereum";

// 组装“一笔交易完成存款”的批量调用：
//   1) token.approve(bank, amount)
//   2) bank.deposit(amount)
export function buildDepositBatch(amount: string): EIP5792Call[] {
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

  return [
    { to: TOKEN_ADDRESS, data: approveData, value: "0x0" },
    { to: BANK_ADDRESS, data: depositData, value: "0x0" },
  ];
}
