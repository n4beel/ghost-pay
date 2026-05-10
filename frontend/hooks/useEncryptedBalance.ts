"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { queryEncryptedBalances, convertMxeBalancesToShared, type EncryptedTokenBalance } from "@/lib/umbra/balance";
import type { UmbraClient } from "@/lib/umbra/client";

const CALLBACK_POLL_INTERVAL_MS = 8000;

interface EncryptedBalanceState {
  balances: EncryptedTokenBalance[];
  totalUsd: number;
  loading: boolean;
  converting: boolean;
  error: string | null;       // balance load error
  convertError: string | null; // conversion error (doesn't blank out balance display)
}

export function useEncryptedBalance(client: UmbraClient | null, isReady: boolean) {
  const [state, setState] = useState<EncryptedBalanceState>({
    balances: [],
    totalUsd: 0,
    loading: false,
    converting: false,
    error: null,
    convertError: null,
  });

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!client || !isReady) return;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const balances = await queryEncryptedBalances(client);
      setState((s) => ({ ...s, balances, totalUsd: 0, loading: false }));
      return balances;
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load balance",
      }));
    }
  }, [client, isReady]);

  // Poll every 8 s while any token has callbackPending, stop when all resolve
  const startPolling = useCallback((clientRef: UmbraClient) => {
    stopPolling();
    const tick = async () => {
      const querier = async () => {
        try {
          const balances = await queryEncryptedBalances(clientRef);
          setState((s) => ({ ...s, balances, totalUsd: 0, loading: false }));
          if (balances.some((b) => b.callbackPending)) {
            pollRef.current = setTimeout(tick, CALLBACK_POLL_INTERVAL_MS);
          } else {
            pollRef.current = null;
          }
        } catch {
          // keep polling on transient errors
          pollRef.current = setTimeout(tick, CALLBACK_POLL_INTERVAL_MS);
        }
      };
      await querier();
    };
    pollRef.current = setTimeout(tick, CALLBACK_POLL_INTERVAL_MS);
  }, [stopPolling]);

  const convertMxe = useCallback(async () => {
    if (!client || !isReady) return;
    setState((s) => ({ ...s, converting: true, convertError: null }));
    try {
      await convertMxeBalancesToShared(client);
      const balances = await queryEncryptedBalances(client);
      setState((s) => ({ ...s, balances, totalUsd: 0, converting: false, convertError: null }));
      if (balances.some((b) => b.callbackPending)) {
        startPolling(client);
      }
    } catch (err) {
      console.error("[convertMxe]", err);
      setState((s) => ({
        ...s,
        converting: false,
        convertError: err instanceof Error ? err.message : "Conversion failed",
      }));
    }
  }, [client, isReady, startPolling]);

  useEffect(() => {
    if (!isReady) {
      stopPolling();
      setState({ balances: [], totalUsd: 0, loading: false, converting: false, error: null, convertError: null });
      return;
    }
    refresh();
    return stopPolling;
  }, [isReady, refresh, stopPolling]);

  const hasMxeBalances = state.balances.some((b) => b.mxeMode);
  const hasCallbackPending = state.balances.some((b) => b.callbackPending);

  return { ...state, hasMxeBalances, hasCallbackPending, refresh: () => refresh(), convertMxe };
}
