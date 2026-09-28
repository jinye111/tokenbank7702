import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import {
  connect,
  getChainId,
  getProvider,
  isDelegatedToOfficial,
  supportsAtomicBatch,
} from "../lib/wallet";

export function useWallet() {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [supportsAtomic, setSupportsAtomic] = useState(false);
  const [isDelegated, setIsDelegated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawCapabilities, setRawCapabilities] = useState<string>("");

  const refresh = useCallback(async (acct: Address | null) => {
    if (!acct) {
      setChainId(null);
      setSupportsAtomic(false);
      setIsDelegated(false);
      return;
    }
    try {
      const cid = await getChainId();
      const [atomicResult, delegated] = await Promise.all([
        supportsAtomicBatch(acct, cid),
        isDelegatedToOfficial(acct),
      ]);
      setChainId(cid);
      setSupportsAtomic(atomicResult.supported);
      setRawCapabilities(JSON.stringify(atomicResult.raw, null, 2));
      setIsDelegated(delegated);
    } catch (err) {
      console.error("刷新钱包状态失败:", err);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setLoading(true);
    try {
      const acct = await connect();
      setAccount(acct);
      await refresh(acct);
    } catch (err) {
      console.error("连接钱包失败:", err);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      const acct = (accounts[0] as Address) ?? null;
      setAccount(acct);
      void refresh(acct);
    };
    const onChainChanged = () => {
      if (account) void refresh(account);
    };

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    return () => {
      provider.removeListener("accountsChanged", onAccountsChanged);
      provider.removeListener("chainChanged", onChainChanged);
    };
  }, [account, refresh]);

  return {
    account,
    chainId,
    supportsAtomic,
    isDelegated,
    loading,
    rawCapabilities,
    connectWallet,
    refresh,
  };
}
