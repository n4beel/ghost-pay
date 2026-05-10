"use client";

import { useEffect, useState, useCallback } from "react";
import { queryEncryptedBalances, type EncryptedTokenBalance } from "@/lib/umbra/balance";
import type { UmbraClient } from "@/lib/umbra/client";

interface EncryptedBalanceState {
  balances: EncryptedTokenBalance[];
  totalUsd: number; // placeholder — Umbra doesn't provide USD; caller layers pricing
  loading: boolean;
  error: string | null;
}

export function useEncryptedBalance(client: UmbraClient | null, isReady: boolean) {
  const [state, setState] = useState<EncryptedBalanceState>({
    balances: [],
    totalUsd: 0,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!client || !isReady) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const balances = await queryEncryptedBalances(client);
      setState({ balances, totalUsd: 0, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load balance",
      }));
    }
  }, [client, isReady]);

  useEffect(() => {
    if (!isReady) {
      setState({ balances: [], totalUsd: 0, loading: false, error: null });
      return;
    }
    refresh();
  }, [isReady, refresh]);

  return { ...state, refresh };
}
