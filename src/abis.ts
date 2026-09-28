import { parseAbi } from "viem";

// 只包含前端需要用到的函数，最小化 ABI
export const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const TOKEN_BANK_ABI = parseAbi([
  "function deposit(uint256 _amount)",
  "function withdraw(uint256 _amount)",
  "function balanceOf(address _user) view returns (uint256)",
  "function token() view returns (address)",
]);
