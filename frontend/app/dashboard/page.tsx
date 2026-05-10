"use client";

import { useCallback, useState } from "react";
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
import { scanAndClaimUtxos } from "@/lib/umbra/receive";
import { useToast } from "@/components/ui/Toast";
import NotConnectedView from "@/components/ui/NotConnectedView";

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
  const { connected } = useWallet();
  const { client, registrationState, register, isReady } = useUmbra();
  const portfolio = usePortfolio();
  const encryptedBalance = useEncryptedBalance(client, isReady);
  const { toast } = useToast();

  const [claiming, setClaiming] = useState(false);

  const handleClaimAll = useCallback(async () => {
    if (!client || claiming) return;
    setClaiming(true);
    try {
      const { claimed } = await scanAndClaimUtxos(client);
      if (claimed > 0) {
        toast("success", `${claimed} payment${claimed > 1 ? "s" : ""} claimed — balance updating`);
        encryptedBalance.refresh();
      } else {
        toast("info", "No pending payments");
      }
    } catch (err) {
      toast("error", "Claim failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setClaiming(false);
    }
  }, [client, claiming, toast, encryptedBalance]);

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
      <RegistrationBanner state={registrationState} onRegister={register} />

      {/* Balance cards */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
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
              <Button variant="ghost" size="sm" onClick={handleClaimAll} disabled={claiming}>
                {claiming ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    Claiming…
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
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              Recent Activity
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              via Dune SIM
            </p>
          </div>
          <Link href="/history" className="text-[12px]" style={{ color: "var(--accent)" }}>
            View all
          </Link>
        </div>

        {portfolio.loading ? (
          <div className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
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
        ) : portfolio.activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              No activity yet
            </p>
            <Link href="/send" className="text-[12px]" style={{ color: "var(--accent)" }}>
              Make your first private payment
            </Link>
          </div>
        ) : (
          portfolio.activities.slice(0, 5).map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3"
              style={{
                borderBottom: i < Math.min(4, portfolio.activities.length - 1) ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <span className="font-mono text-sm w-4 text-center" style={{ color: "var(--text-tertiary)" }}>
                {a.type === "receive" ? "←" : "→"}
              </span>
              <span className="flex-1 text-[13px] capitalize" style={{ color: "var(--text-primary)" }}>
                {a.type}
              </span>
              <span className="font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
                {a.amount ?? "[Private]"}
              </span>
              <Badge variant={a.type === "receive" ? "confirmed" : "private"}>{a.token}</Badge>
              <span className="text-[11px] w-16 text-right" style={{ color: "var(--text-tertiary)" }}>
                {timeAgo(a.timestamp)}
              </span>
            </div>
          ))
        )}
      </Panel>
    </PageShell>
  );
}
