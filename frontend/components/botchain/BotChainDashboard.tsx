"use client";

import Link from "next/link";
import { useAccount, useBalance, useChainId, useGasPrice } from "wagmi";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useStealth } from "@/components/providers/StealthProvider";
import { useStealthPayments } from "@/hooks/useStealthPayments";
import { addressUrl, botChainById } from "@/lib/botchain/chain";
import { formatNativeAmount } from "@/lib/botchain/amount";
import { isDust } from "@/lib/stealth";
import StealthLockedNotice from "./StealthLockedNotice";

/**
 * BOT Chain dashboard.
 *
 * Two balances that mean different things and must not be added together: what your connected
 * wallet holds in public view, and what has arrived at one-time addresses only you can spend from.
 * Summing them would imply the second is spendable from the first, which it is not until claimed.
 */
export default function BotChainDashboard() {
  const chainId = useChainId();
  const { address } = useAccount();
  const { viewingKeys, status } = useStealth();
  const { payments, scanning } = useStealthPayments(viewingKeys);
  const { data: balance } = useBalance({ address, query: { enabled: Boolean(address) } });
  const { data: gasPrice } = useGasPrice();

  const chain = botChainById(chainId);
  const symbol = chain.nativeCurrency.symbol;

  const settled = (balanceWei: bigint | null) =>
    balanceWei !== null && gasPrice !== undefined && isDust(balanceWei, gasPrice);

  const claimable = payments.filter((p) => !settled(p.balance));
  const claimableTotal = claimable.reduce((sum, p) => sum + (p.balance ?? p.amount ?? 0n), 0n);
  const receivedTotal = payments.reduce((sum, p) => sum + (p.amount ?? 0n), 0n);

  return (
    <div className="mx-auto w-full flex flex-col gap-4" style={{ maxWidth: "760px" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <p
            className="text-[11px] uppercase tracking-[0.04em] mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Wallet balance
          </p>
          <p className="text-[26px] font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
            {balance ? formatNativeAmount(balance.value) : "—"}{" "}
            <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>{symbol}</span>
          </p>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Public. Visible to anyone looking at your address.
          </p>
          {address && (
            <a
              href={addressUrl(chainId, address)}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[11px] mt-3"
              style={{ color: "var(--accent)" }}
            >
              View on explorer
            </a>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[11px] uppercase tracking-[0.04em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Unclaimed stealth
            </p>
            <Badge variant="private">Stealth</Badge>
          </div>
          {status !== "unlocked" ? (
            <p className="text-[26px] font-semibold font-mono" style={{ color: "var(--text-tertiary)" }}>
              ——
            </p>
          ) : (
            <p className="text-[26px] font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
              {formatNativeAmount(claimableTotal)}{" "}
              <span className="text-[15px]" style={{ color: "var(--text-secondary)" }}>{symbol}</span>
            </p>
          )}
          <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            {status !== "unlocked"
              ? "Locked — only your viewing key can see these."
              : scanning
                ? "Scanning announcements…"
                : `${claimable.length} waiting · ${formatNativeAmount(receivedTotal)} ${symbol} received in total`}
          </p>
          {status === "unlocked" && claimable.length > 0 && (
            <Link href="/receive">
              <Button size="sm" className="mt-3">Claim</Button>
            </Link>
          )}
        </Panel>
      </div>

      {status !== "unlocked" ? (
        <StealthLockedNotice what="Incoming payments" />
      ) : (
        <Panel noPadding>
          <div
            className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              Recent stealth payments
            </p>
            <Link href="/history" className="text-[12px]" style={{ color: "var(--accent)" }}>
              View all
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {scanning ? "Scanning…" : "No payments yet"}
              </p>
              <Link href="/receive" className="text-[12px]" style={{ color: "var(--accent)" }}>
                Share your meta-address
              </Link>
            </div>
          ) : (
            payments.slice(-5).reverse().map((payment, i, list) => (
              <div
                key={payment.stealthAddress}
                className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                style={{
                  borderBottom: i < list.length - 1 ? "1px solid var(--border-subtle)" : "none",
                }}
              >
                <span
                  className="font-mono text-sm w-4 text-center flex-shrink-0"
                  style={{ color: "var(--success)" }}
                >
                  ↓
                </span>
                <span className="flex-1 min-w-0 truncate font-mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {payment.stealthAddress}
                </span>
                <span className="font-mono text-[12px] flex-shrink-0" style={{ color: "var(--text-primary)" }}>
                  {formatNativeAmount(payment.amount ?? 0n)} {symbol}
                </span>
                <Badge variant={settled(payment.balance) ? "default" : "private"}>
                  {settled(payment.balance) ? "Claimed" : "New"}
                </Badge>
              </div>
            ))
          )}
        </Panel>
      )}
    </div>
  );
}
