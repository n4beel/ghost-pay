"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export interface PublicTokenBalance {
  symbol: string;
  mint: string;
  balance: number;
  usdValue: number;
  logoUrl?: string;
}

export interface Portfolio {
  tokens: PublicTokenBalance[];
  totalUsd: number;
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
}

export interface ActivityItem {
  type: "send" | "receive" | "shield" | "unshield" | "other";
  amount: string | null;
  token: string;
  timestamp: number;
  txHash?: string;
}

export function usePortfolio(): Portfolio {
  const { publicKey } = useWallet();
  const [state, setState] = useState<Portfolio>({
    tokens: [],
    totalUsd: 0,
    activities: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!publicKey) {
      setState({ tokens: [], totalUsd: 0, activities: [], loading: false, error: null });
      return;
    }

    const wallet = publicKey.toBase58();
    let cancelled = false;

    setState((s) => ({ ...s, loading: true, error: null }));

    fetch(`/api/portfolio?wallet=${wallet}`)
      .then((r) => r.json())
      .then((portfolio) => {
        if (cancelled) return;
        // Dune SIM SVM balances — response shape: { balances: [...], balances_count: N }
        // Each item: { address, balance (formatted string), value_usd, symbol, decimals, ... }
        const duneBalances: Record<string, unknown>[] =
          portfolio.balances?.balances ??
          portfolio.balances?.data ??
          (Array.isArray(portfolio.balances) ? portfolio.balances : []);

        const tokens: PublicTokenBalance[] = duneBalances
          .filter((b) => parseFloat(String(b.balance ?? b.amount ?? "0")) > 0)
          .map((b) => {
            const mint = String(b.address ?? b.token_address ?? b.mint ?? "");
            const symbol = String(b.symbol ?? b.token_symbol ?? "???");
            // Dune SVM `balance` is already human-readable (e.g. "3.676548")
            const balance = parseFloat(String(b.balance ?? b.amount ?? "0"));
            const usdValue = parseFloat(String(b.value_usd ?? b.usd_value ?? "0"));
            return {
              symbol,
              mint,
              balance,
              usdValue,
              logoUrl: String(b.logo_uri ?? b.token_icon ?? ""),
            };
          });

        const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);

        // Dune SIM SVM transactions — response shape: { transactions: [...] }
        // Each item: { block_time (microseconds!), address, chain, raw_transaction, ... }
        const rawActivities: Record<string, unknown>[] =
          portfolio.activities?.transactions ??
          portfolio.activities?.activities ??
          portfolio.activities?.data ??
          (Array.isArray(portfolio.activities) ? portfolio.activities : []);

        const activities: ActivityItem[] = rawActivities.slice(0, 20).map((a) => {
          // block_time is in microseconds in Dune SVM
          const rawTime = typeof a.block_time === "number" ? a.block_time : 0;
          const timestamp = rawTime > 1e12 ? Math.floor(rawTime / 1000) : rawTime * 1000;
          return {
            type: "other" as ActivityItem["type"],
            amount: null,
            token: "SOL",
            timestamp: timestamp || Date.now(),
            txHash: String(a.tx_hash ?? a.transaction_hash ?? ""),
          };
        });

        setState({ tokens, totalUsd, activities, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load portfolio",
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  return state;
}

function deriveActivityType(raw: string): ActivityItem["type"] {
  const lower = raw.toLowerCase();
  if (lower.includes("transfer") || lower.includes("send")) return "send";
  if (lower.includes("receive")) return "receive";
  if (lower.includes("deposit") || lower.includes("shield")) return "shield";
  if (lower.includes("withdraw") || lower.includes("unshield")) return "unshield";
  return "other";
}
