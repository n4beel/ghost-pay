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

    Promise.all([
      fetch(`/api/portfolio?wallet=${wallet}`).then((r) => r.json()),
      fetch(`/api/pricing?wallet=${wallet}`).then((r) => r.json()),
    ])
      .then(([portfolio, pricing]) => {
        if (cancelled) return;

        // Dune SIM balances
        const duneBalances: Record<string, unknown>[] =
          portfolio.balances?.balances ?? portfolio.balances?.data ?? [];

        // Covalent items for USD values
        const covalentItems: Record<string, unknown>[] = pricing.data?.items ?? [];

        const tokens: PublicTokenBalance[] = duneBalances
          .filter((b) => parseFloat(String(b.amount ?? b.balance ?? "0")) > 0)
          .map((b) => {
            const mint = String(b.token_address ?? b.mint ?? "");
            const symbol = String(b.symbol ?? b.token_symbol ?? "???");
            const balance = parseFloat(String(b.amount ?? b.balance ?? "0"));
            const cov = covalentItems.find(
              (c) =>
                String(c.contract_address ?? "").toLowerCase() === mint.toLowerCase(),
            );
            const usdValue = cov
              ? parseFloat(String(cov.quote ?? "0"))
              : parseFloat(String(b.value_usd ?? b.usd_value ?? "0"));
            return {
              symbol,
              mint,
              balance,
              usdValue,
              logoUrl: String(b.logo_uri ?? b.token_icon ?? ""),
            };
          });

        const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);

        // Dune SIM activities
        const rawActivities: Record<string, unknown>[] =
          portfolio.activities?.activities ?? portfolio.activities?.data ?? [];

        const activities: ActivityItem[] = rawActivities.slice(0, 20).map((a) => ({
          type: deriveActivityType(String(a.type ?? a.activity_type ?? "")),
          amount: null,
          token: String(a.symbol ?? a.token_symbol ?? "SOL"),
          timestamp:
            typeof a.block_time === "number"
              ? a.block_time * 1000
              : typeof a.timestamp === "number"
              ? a.timestamp
              : Date.now(),
          txHash: String(a.transaction_hash ?? a.tx_hash ?? ""),
        }));

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
