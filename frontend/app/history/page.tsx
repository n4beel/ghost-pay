"use client";

import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio, type ActivityItem } from "@/hooks/usePortfolio";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const typeLabel: Record<ActivityItem["type"], string> = {
  shield: "Shielded",
  send: "Sent",
  receive: "Received",
  unshield: "Unshielded",
  other: "Transaction",
};

const typeBadge: Record<ActivityItem["type"], "private" | "confirmed" | "pending" | "default"> = {
  shield: "confirmed",
  send: "private",
  receive: "private",
  unshield: "default",
  other: "default",
};

export default function HistoryPage() {
  const { connected } = useWallet();
  const { activities, loading } = usePortfolio();

  return (
    <PageShell title="History" description="Transaction history via Dune SIM">
      {!connected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect your wallet to view history.
        </p>
      ) : (
        <div style={{ maxWidth: "640px" }}>
          <Panel noPadding>
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                All Activity
              </p>
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                Dune SIM
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-3"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div className="w-4 h-4 skeleton rounded" />
                    <div className="flex-1 h-4 skeleton" />
                    <div className="w-16 h-4 skeleton" />
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  No activity found
                </p>
              </div>
            ) : (
              activities.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-3 transition-colors"
                  style={{
                    borderBottom:
                      i < activities.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <span className="font-mono text-sm" style={{ color: "var(--text-tertiary)" }}>
                    {a.type === "receive" ? "←" : "→"}
                  </span>
                  <span className="flex-1 text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {typeLabel[a.type]}
                  </span>
                  <span className="font-mono text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {a.amount ?? "[Private]"}
                  </span>
                  <Badge variant={typeBadge[a.type]}>{a.token}</Badge>
                  <span
                    className="text-[11px] w-16 text-right"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {timeAgo(a.timestamp)}
                  </span>
                </div>
              ))
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
