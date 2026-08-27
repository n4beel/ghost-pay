"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { useChain } from "@/components/providers/ChainProvider";
import SolanaOnlyNotice from "@/components/botchain/SolanaOnlyNotice";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";

const PROJECT_ID = "cmozo5pxf0266k01hc7zscq54";
const CLAIM_URL = `https://server.torque.so/claim?projectId=${PROJECT_ID}&wallet=`;

interface LeaderboardEntry {
  rank: number;
  address: string;
  count: number;
}

export default function RewardsPage() {
  const { isBotChain } = useChain();

  // Solana-only. Rendering its connect prompt on BOT Chain would invite a second
  // wallet connection the app deliberately prevents.
  if (isBotChain) {
    return (
      <PageShell title="Rewards" description="Private payment leaderboard">
        <SolanaOnlyNotice feature="Rewards" />
      </PageShell>
    );
  }

  return <SolanaRewardsPage />;
}

function SolanaRewardsPage() {
  const { connected, publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected) return;
    setLoading(true);
    fetch("/api/torque")
      .then((r) => r.json())
      .then((data) => setLeaderboard(data.leaderboard ?? []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [connected]);

  return (
    <PageShell
      title="Rewards"
      description="Privacy leaderboard — most private payments this week via Torque"
    >
      {!connected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect your wallet to view rewards.
        </p>
      ) : (
        <div className="flex flex-col gap-4 mx-auto w-full" style={{ maxWidth: "560px" }}>
          <Panel noPadding>
            <div
              className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div>
                <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  Weekly Leaderboard
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  Epoch 1 · May 12 – May 19, 2026
                </p>
              </div>
              <Badge variant="default">Torque</Badge>
            </div>

            {loading ? (
              <div className="flex flex-col">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <div className="w-5 h-4 skeleton" />
                    <div className="flex-1 h-4 skeleton" />
                    <div className="w-10 h-4 skeleton" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  Results available after epoch ends May 19
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  Send private payments to earn a spot
                </p>
              </div>
            ) : (
              leaderboard.map((entry, i) => {
                const isCurrentUser = publicKey?.toBase58() === entry.address;
                return (
                  <div
                    key={entry.rank}
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 transition-colors"
                    style={{
                      background: isCurrentUser ? "var(--accent-dim)" : "transparent",
                      borderBottom: i < leaderboard.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <span
                      className="font-mono text-[13px] w-5 text-center flex-shrink-0"
                      style={{ color: entry.rank <= 3 ? "var(--accent)" : "var(--text-tertiary)" }}
                    >
                      #{entry.rank}
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate font-mono text-[12px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      {isCurrentUser && (
                        <span className="ml-2 text-[11px]" style={{ color: "var(--accent)" }}>
                          you
                        </span>
                      )}
                    </span>
                    <span
                      className="font-mono text-[13px]"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {entry.count}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      payments
                    </span>
                    {isCurrentUser && entry.rank <= 3 && (
                      <a
                        href={CLAIM_URL + entry.address}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] px-2 py-1"
                        style={{ background: "var(--accent)", color: "var(--bg-base)", borderRadius: "2px" }}
                      >
                        Claim
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </Panel>

          <Panel elevated>
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              How to earn
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Send private payments via Ghost Pay to climb the leaderboard. Top 3 wallets each
              week receive USDC rewards from the Ghost Pay treasury.
            </p>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
