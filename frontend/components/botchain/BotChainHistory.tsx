"use client";

import { useChainId, useGasPrice } from "wagmi";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useStealth } from "@/components/providers/StealthProvider";
import { useStealthPayments } from "@/hooks/useStealthPayments";
import { botChainById, txUrl } from "@/lib/botchain/chain";
import { formatNativeAmount } from "@/lib/botchain/amount";
import { isDust } from "@/lib/stealth";
import StealthLockedNotice from "./StealthLockedNotice";

/**
 * Every stealth payment this identity has received, oldest last.
 *
 * Only incoming. Payments you *send* leave no record tied to your identity — that is the point of
 * the scheme, and the sender's own wallet history is the only place they exist. Saying so beats
 * showing an empty "sent" column that looks broken.
 */
export default function BotChainHistory() {
  const chainId = useChainId();
  const { viewingKeys, status } = useStealth();
  const { payments, scanning, progress, error, liveUnavailable, rescan } =
    useStealthPayments(viewingKeys);
  const { data: gasPrice } = useGasPrice();

  const symbol = botChainById(chainId).nativeCurrency.symbol;
  const settled = (balance: bigint | null) =>
    balance !== null && gasPrice !== undefined && isDust(balance, gasPrice);

  if (status !== "unlocked") {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: "680px" }}>
        <StealthLockedNotice what="Payment history" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full flex flex-col gap-4" style={{ maxWidth: "680px" }}>
      <Panel noPadding>
        <div
          className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            Received
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {payments.length} payment{payments.length === 1 ? "" : "s"}
            </span>
            <Button size="sm" variant="ghost" onClick={rescan} disabled={scanning}>
              Rescan
            </Button>
          </div>
        </div>

        {error && (
          <p className="px-4 sm:px-5 py-3 text-[12px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        {liveUnavailable && !error && (
          <p className="px-4 sm:px-5 py-3 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            This RPC doesn&apos;t support live updates. Press Rescan to check for new payments.
          </p>
        )}

        {scanning && payments.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <Spinner label="Scanning announcements…" />
            {progress && (
              <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                block {progress.scanned.toString()} / {progress.head.toString()}
              </p>
            )}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              No stealth payments yet
            </p>
          </div>
        ) : (
          [...payments].reverse().map((payment, i, list) => (
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
              <div className="flex-1 min-w-0">
                <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                  {formatNativeAmount(payment.amount ?? 0n, 6)} {symbol}
                </p>
                <a
                  href={txUrl(chainId, payment.transactionHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] truncate block"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  block {payment.blockNumber.toString()} · {payment.stealthAddress}
                </a>
              </div>
              <Badge variant={settled(payment.balance) ? "default" : "private"}>
                {settled(payment.balance) ? "Claimed" : "Unclaimed"}
              </Badge>
            </div>
          ))
        )}
      </Panel>

      <p className="text-[11px] leading-relaxed px-1" style={{ color: "var(--text-tertiary)" }}>
        Incoming only. A stealth payment you send leaves nothing on chain tied to your identity —
        only your wallet&apos;s own transaction list records it.
      </p>
    </div>
  );
}
