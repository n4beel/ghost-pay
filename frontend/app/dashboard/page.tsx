"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import RedactedValue from "@/components/ui/RedactedValue";
import ShieldModal from "@/components/ShieldModal";
import UnshieldModal from "@/components/UnshieldModal";
import PortfolioBar from "@/components/dashboard/PortfolioBar";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUmbra } from "@/hooks/useUmbra";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useEncryptedBalance } from "@/hooks/useEncryptedBalance";
import { formatBalance } from "@/lib/umbra/balance";
import NotConnectedView from "@/components/ui/NotConnectedView";
import { useClaimBackground } from "@/components/providers/ClaimProvider";
import { loadActivities, type LocalActivity } from "@/lib/activity-log";
import { useChain } from "@/components/providers/ChainProvider";
import BotChainGate from "@/components/botchain/BotChainGate";
import BotChainDashboard from "@/components/botchain/BotChainDashboard";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function RegistrationBanner({
  state,
  onRegister,
}: {
  state: string;
  onRegister: () => void;
}) {
  if (state === "registered" || state === "unknown") return null;

  if (state === "checking") {
    return (
      <div
        className="mb-6 flex items-center gap-3 px-4 py-3 text-[13px]"
        style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--text-secondary)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--warning)" }} />
        Checking Umbra registration...
      </div>
    );
  }

  if (state === "registering") {
    return (
      <div
        className="mb-6 flex items-center gap-3 px-4 py-3 text-[13px]"
        style={{ border: "1px solid var(--accent)", background: "var(--accent-dim)", color: "var(--accent)" }}
      >
        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        Registering on Umbra — sign the transaction in your wallet
      </div>
    );
  }

  if (state === "unregistered") {
    return (
      <div
        className="mb-6 flex items-start gap-4 px-5 py-4"
        style={{ border: "1px solid var(--border-default)", background: "var(--bg-surface)" }}
      >
        <div className="flex-1">
          <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
            One-time setup required
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Register your wallet with Umbra to enable private payments. One-time on-chain
            transaction.
          </p>
        </div>
        <Button size="sm" onClick={onRegister}>
          Register
        </Button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className="mb-6 px-4 py-3 text-[13px]"
        style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
      >
        Failed to initialize Umbra. Ensure your wallet supports the Wallet Standard.
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  const { isBotChain } = useChain();

  if (isBotChain) return <BotChainDashboardPage />;
  return <SolanaDashboardPage />;
}

function BotChainDashboardPage() {
  return (
    <PageShell title="Dashboard" description="Your BOT Chain balance and incoming stealth payments">
      <BotChainGate>
        <BotChainDashboard />
      </BotChainGate>
    </PageShell>
  );
}

function SolanaDashboardPage() {
  const { connected, publicKey } = useWallet();
  const { client, registrationState, register, isReady } = useUmbra();
  const portfolio = usePortfolio();
  const encryptedBalance = useEncryptedBalance(client, isReady);
  const { claiming, claimElapsed, startClaim, lastClaimAt } = useClaimBackground();

  const [localActivity, setLocalActivity] = useState<LocalActivity[]>([]);

  useEffect(() => {
    if (!publicKey) { setLocalActivity([]); return; }
    setLocalActivity(loadActivities(publicKey.toBase58()).slice(0, 5));
  }, [publicKey]);

  // Refresh balance whenever a background claim completes
  useEffect(() => {
    if (lastClaimAt) encryptedBalance.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClaimAt]);

  // Total private balance in USD (no oracle — show raw token amounts)
  const sharedBalances = encryptedBalance.balances.filter((b) => !b.mxeMode && !b.callbackPending && b.balance > 0);
  const mxeBalances = encryptedBalance.balances.filter((b) => b.mxeMode);
  const pendingCallbackBalances = encryptedBalance.balances.filter((b) => b.callbackPending);
  const totalPrivateDisplay =
    sharedBalances.length === 0
      ? null
      : sharedBalances
          .map((b) => `${formatBalance(b.balance, b.decimals)} ${b.symbol}`)
          .join(" + ");

  if (!connected) {
    return (
      <PageShell title="Dashboard">
        <NotConnectedView message="Connect your wallet to access Ghost Pay." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard">
      <div className="mx-auto w-full" style={{ maxWidth: "900px" }}>
      <RegistrationBanner state={registrationState} onRegister={register} />

      {/* Balance cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Private Balance */}
        <Panel>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] uppercase tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
              Private Balance
            </p>
            <Badge variant="private">Umbra</Badge>
          </div>

          {encryptedBalance.loading ? (
            <div className="h-9 w-40 skeleton mb-1" />
          ) : encryptedBalance.error ? (
            <p className="text-[13px] mb-1" style={{ color: "var(--danger)" }}>
              Failed to load
            </p>
          ) : totalPrivateDisplay ? (
            <RedactedValue value={totalPrivateDisplay} className="text-[22px] font-semibold font-mono" />
          ) : (
            <p className="text-[22px] font-semibold font-mono" style={{ color: "var(--text-tertiary)" }}>
              —
            </p>
          )}

          <p className="text-[11px] mt-1 mb-3" style={{ color: "var(--text-tertiary)" }}>
            {isReady ? "Click value to reveal" : "Connect & register to view"}
          </p>

          {pendingCallbackBalances.length > 0 && (
            <div
              className="flex items-center gap-3 px-3 py-2 mb-3 text-[12px]"
              style={{ border: "1px solid var(--accent)", background: "var(--accent-dim)", color: "var(--text-secondary)" }}
            >
              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>
                {pendingCallbackBalances.map((b) => b.symbol).join(", ")} awaiting Arcium callback — balance will appear automatically
              </span>
            </div>
          )}

          {mxeBalances.length > 0 && (
            <div
              className="flex flex-col gap-1 px-3 py-2 mb-3 text-[12px]"
              style={{ border: "1px solid var(--warning)", background: "var(--accent-dim)" }}
            >
              <div className="flex items-center justify-between gap-3" style={{ color: "var(--text-secondary)" }}>
                <span>
                  {mxeBalances.map((b) => b.symbol).join(", ")} balance pending conversion to shared mode
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={encryptedBalance.convertMxe}
                  disabled={encryptedBalance.converting}
                >
                  {encryptedBalance.converting ? "Converting…" : "Convert"}
                </Button>
              </div>
              {encryptedBalance.convertError && (
                <p className="text-[11px]" style={{ color: "var(--danger)" }}>
                  {encryptedBalance.convertError}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Link href="/send">
              <Button size="sm" disabled={!isReady}>Send</Button>
            </Link>
            {client && isReady ? (
              <>
                <ShieldModal
                  client={client}
                  onSuccess={encryptedBalance.refresh}
                  trigger={<Button variant="ghost" size="sm">Shield</Button>}
                />
                <UnshieldModal
                  client={client}
                  encryptedBalances={encryptedBalance.balances}
                  onSuccess={encryptedBalance.refresh}
                  trigger={<Button variant="ghost" size="sm">Unshield</Button>}
                />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" disabled>Shield</Button>
                <Button variant="ghost" size="sm" disabled>Unshield</Button>
              </>
            )}
            {isReady && (
              <Button variant="ghost" size="sm" onClick={startClaim} disabled={claiming}>
                {claiming ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    Scanning… {claimElapsed}s
                  </span>
                ) : "Claim All"}
              </Button>
            )}
          </div>
        </Panel>

        {/* Public Balance */}
        <Panel>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] uppercase tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
              Public Balance
            </p>
            <Badge variant="default">Dune SIM</Badge>
          </div>

          {portfolio.loading ? (
            <>
              <div className="h-9 w-32 skeleton mb-1" />
              <div className="h-4 w-20 skeleton mt-2" />
            </>
          ) : portfolio.totalUsd > 0 ? (
            <>
              <p className="text-[28px] font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                ${portfolio.totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-3">
                <PortfolioBar tokens={portfolio.tokens} totalUsd={portfolio.totalUsd} />
              </div>
            </>
          ) : (
            <p className="text-[22px] font-semibold font-mono" style={{ color: "var(--text-tertiary)" }}>
              —
            </p>
          )}
        </Panel>
      </div>

      {/* Recent Activity */}
      <Panel noPadding>
        <div
          className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            Recent Activity
          </p>
          <Link href="/history" className="text-[12px]" style={{ color: "var(--accent)" }}>
            View all
          </Link>
        </div>

        {localActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              No activity yet
            </p>
            <Link href="/send" className="text-[12px]" style={{ color: "var(--accent)" }}>
              Make your first private payment
            </Link>
          </div>
        ) : (
          localActivity.map((a, i) => {
            const arrow = a.type === "claim" || a.type === "shield" ? "←" : "→";
            const label: Record<LocalActivity["type"], string> = {
              send: "Sent", send_vault: "Sent (Vault)", shield: "Shielded",
              unshield: "Unshielded", claim: "Claimed", payroll: "Payroll",
            };
            return (
              <div
                key={i}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                style={{
                  borderBottom: i < localActivity.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <span className="font-mono text-sm w-4 text-center flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                  {arrow}
                </span>
                <span className="flex-1 min-w-0 truncate text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {label[a.type]}
                </span>
                <span className="font-mono text-[12px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                  {a.amount}
                </span>
                <Badge variant={a.type === "send" || a.type === "send_vault" || a.type === "claim" ? "private" : "confirmed"}>
                  {a.token}
                </Badge>
                {/* Five columns will not fit a phone. The timestamp is the one nobody scans a list
                    for, so it is the one that goes. */}
                <span className="hidden sm:block text-[11px] w-16 text-right flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                  {timeAgo(a.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </Panel>
      </div>
    </PageShell>
  );
}
