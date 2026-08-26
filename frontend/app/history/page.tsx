"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio, type ActivityItem } from "@/hooks/usePortfolio";
import NotConnectedView from "@/components/ui/NotConnectedView";
import { loadActivities, type LocalActivity } from "@/lib/activity-log";
import { useChain } from "@/components/providers/ChainProvider";
import BotChainGate from "@/components/botchain/BotChainGate";
import BotChainHistory from "@/components/botchain/BotChainHistory";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const typeLabel: Record<ActivityItem["type"] | LocalActivity["type"], string> = {
  shield: "Shielded",
  send: "Sent",
  send_vault: "Sent (Vault)",
  receive: "Received",
  unshield: "Unshielded",
  claim: "Claimed",
  payroll: "Payroll",
  other: "Transaction",
};

const typeBadge: Record<
  ActivityItem["type"] | LocalActivity["type"],
  "private" | "confirmed" | "pending" | "default"
> = {
  shield: "confirmed",
  send: "private",
  send_vault: "private",
  receive: "private",
  claim: "private",
  unshield: "default",
  payroll: "confirmed",
  other: "default",
};

const typeArrow: Record<ActivityItem["type"] | LocalActivity["type"], string> = {
  shield: "↓",
  send: "→",
  send_vault: "→",
  receive: "←",
  claim: "←",
  unshield: "↑",
  payroll: "→",
  other: "·",
};

export default function HistoryPage() {
  const { isBotChain } = useChain();

  if (isBotChain) return <BotChainHistoryPage />;
  return <SolanaHistoryPage />;
}

function BotChainHistoryPage() {
  return (
    <PageShell title="History" description="Stealth payments received on BOT Chain">
      <BotChainGate>
        <BotChainHistory />
      </BotChainGate>
    </PageShell>
  );
}

function SolanaHistoryPage() {
  const { publicKey, connected } = useWallet();
  const { activities: duneActivities, loading } = usePortfolio();
  const [localActivities, setLocalActivities] = useState<LocalActivity[]>([]);

  useEffect(() => {
    if (!publicKey) { setLocalActivities([]); return; }
    setLocalActivities(loadActivities(publicKey.toBase58()));
  }, [publicKey]);

  return (
    <PageShell title="History" description="Your private activity log">
      {!connected ? (
        <NotConnectedView message="Connect your wallet to view transaction history." />
      ) : (
        <div className="flex flex-col gap-4 mx-auto w-full" style={{ maxWidth: "640px" }}>
          {/* Local activity log */}
          <Panel noPadding>
            <div
              className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Activity
              </p>
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                This device
              </span>
            </div>

            {localActivities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  No activity yet — send, shield, or claim to see history
                </p>
              </div>
            ) : (
              localActivities.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 transition-colors"
                  style={{
                    borderBottom:
                      i < localActivities.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <span className="font-mono text-sm w-4 text-center flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                    {typeArrow[a.type]}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {typeLabel[a.type]}
                  </span>
                  <span className="font-mono text-[13px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {a.amount}
                  </span>
                  <Badge variant={typeBadge[a.type]}>{a.token}</Badge>
                  <span
                    className="hidden sm:block text-[11px] w-16 text-right flex-shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {timeAgo(a.timestamp)}
                  </span>
                </div>
              ))
            )}
          </Panel>

          {/* On-chain activity from Dune SIM */}
          <Panel noPadding>
            <div
              className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                On-chain
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
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div className="w-4 h-4 skeleton rounded" />
                    <div className="flex-1 h-4 skeleton" />
                    <div className="w-16 h-4 skeleton" />
                  </div>
                ))}
              </div>
            ) : duneActivities.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  No on-chain activity found
                </p>
              </div>
            ) : (
              duneActivities.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 transition-colors"
                  style={{
                    borderBottom:
                      i < duneActivities.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <span className="font-mono text-sm w-4 text-center flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                    {typeArrow[a.type]}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[13px]" style={{ color: "var(--text-primary)" }}>
                    {typeLabel[a.type]}
                  </span>
                  <span className="font-mono text-[13px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {a.amount ?? "[Private]"}
                  </span>
                  <Badge variant={typeBadge[a.type]}>{a.token}</Badge>
                  <span
                    className="hidden sm:block text-[11px] w-16 text-right flex-shrink-0"
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
