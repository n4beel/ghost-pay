"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hex } from "viem";
import {
  useAccount,
  useChainId,
  useGasPrice,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useStealth } from "@/components/providers/StealthProvider";
import { useStealthPayments, type StealthPaymentRow } from "@/hooks/useStealthPayments";
import { activeBotChain, botChainById, isBotChainId, txUrl } from "@/lib/botchain/chain";
import { formatNativeAmount } from "@/lib/botchain/amount";
import { readMetaAddress, registerKeysCall } from "@/lib/botchain/registry";
import {
  isDust,
  sweepStealthPayment,
  toMetaAddressUri,
  type StealthKeys,
  type ViewingKeys,
} from "@/lib/stealth";

/**
 * Recipient side: unlock the identity, publish it, find payments, claim them.
 *
 * Three states in sequence, each gating the next, because doing them out of order produces
 * confusing failures: no keys means nothing to publish, and no published keys means nobody can pay
 * you in the first place.
 */
export default function StealthReceivePanel() {
  const { status, keys, viewingKeys, metaAddress, error, unlock } = useStealth();

  return (
    <div className="flex flex-col gap-4 mx-auto w-full" style={{ maxWidth: "560px" }}>
      {status !== "unlocked" || !metaAddress || !keys ? (
        <UnlockCard status={status} error={error} onUnlock={unlock} />
      ) : (
        <>
          <IdentityCard metaAddress={metaAddress} />
          <PaymentsCard viewingKeys={viewingKeys} keys={keys} />
        </>
      )}
    </div>
  );
}

function UnlockCard({
  status,
  error,
  onUnlock,
}: {
  status: string;
  error: string | null;
  onUnlock: () => void;
}) {
  return (
    <Panel>
      <p
        className="text-[11px] uppercase tracking-[0.04em] mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        Stealth identity
      </p>
      <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-tertiary)" }}>
        Your stealth keys are derived from a signature, not stored anywhere. Signing the same
        message on any device gives you the same identity back.
        <br />
        <br />
        Your wallet will ask twice. The second signature is compared against the first — a wallet
        that signs the same message two different ways would give you a new identity every session
        and strand anything already paid to the old one.
      </p>

      {error && (
        <p
          className="text-[12px] leading-relaxed mb-4 px-3 py-2"
          style={{ color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "2px" }}
        >
          {error}
        </p>
      )}

      {status === "unlocking" ? (
        <div className="flex justify-center py-4">
          <Spinner label="Waiting for signatures…" />
        </div>
      ) : (
        <Button onClick={onUnlock}>{status === "error" ? "Try again" : "Unlock stealth keys"}</Button>
      )}
    </Panel>
  );
}

function IdentityCard({ metaAddress }: { metaAddress: Hex }) {
  const chainId = useChainId();
  const client = usePublicClient();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [registered, setRegistered] = useState<boolean | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { isLoading: waiting, isSuccess: mined } = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  const check = useCallback(async () => {
    if (!client || !address || !isBotChainId(chainId)) return;
    try {
      const published = await readMetaAddress(client, chainId, address);
      setRegistered(published === metaAddress);
    } catch {
      setRegistered(null);
    }
  }, [client, address, chainId, metaAddress]);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (mined) {
      toast("success", "Stealth keys published", "Anyone can now pay you by your address alone.");
      void check();
    }
  }, [mined, toast, check]);

  const register = async () => {
    if (!isBotChainId(chainId)) return;
    setSubmitting(true);
    try {
      setHash(await writeContractAsync(registerKeysCall(chainId, metaAddress)));
    } catch (err) {
      toast("error", "Registration failed", err instanceof Error ? err.message.split("\n")[0] : "");
    } finally {
      setSubmitting(false);
    }
  };

  const uri = toMetaAddressUri(metaAddress);

  return (
    <Panel>
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[11px] uppercase tracking-[0.04em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Your stealth meta-address
        </p>
        {registered === true && <Badge variant="confirmed">Published</Badge>}
        {registered === false && <Badge variant="pending">Not published</Badge>}
      </div>

      <p className="font-mono text-[11px] break-all mb-3" style={{ color: "var(--text-secondary)" }}>
        {uri}
      </p>

      <p className="text-[11px] leading-relaxed mb-4" style={{ color: "var(--text-tertiary)" }}>
        {registered
          ? "Published to the on-chain registry. Senders can look you up by your ordinary address — no meta-address to share."
          : "Publish this once so senders can find it by your ordinary address. Until then, share it directly."}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(uri);
            toast("success", "Meta-address copied");
          }}
        >
          Copy meta-address
        </Button>
        {registered !== true && (
          <Button size="sm" loading={submitting || waiting} onClick={register}>
            {waiting ? "Publishing…" : "Publish to registry"}
          </Button>
        )}
        {hash && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(txUrl(chainId, hash), "_blank")}
          >
            View transaction
          </Button>
        )}
      </div>
    </Panel>
  );
}

function PaymentsCard({
  viewingKeys,
  keys,
}: {
  viewingKeys: ViewingKeys | null;
  keys: StealthKeys;
}) {
  const { payments, scanning, progress, error, liveUnavailable, rescan } =
    useStealthPayments(viewingKeys);

  // A swept address keeps a remainder too small to move. Counting it as unclaimed would leave the
  // list permanently showing outstanding payments that no longer exist.
  const { data: gasPrice } = useGasPrice();
  const settled = (p: StealthPaymentRow) =>
    p.balance !== null && gasPrice !== undefined && isDust(p.balance, gasPrice);
  const claimed = payments.filter(settled).length;

  return (
    <Panel>
      <div className="flex items-center justify-between mb-1">
        <p
          className="text-[11px] uppercase tracking-[0.04em]"
          style={{ color: "var(--text-secondary)" }}
        >
          Incoming payments
        </p>
        <Button size="sm" variant="ghost" onClick={rescan} disabled={scanning}>
          Rescan
        </Button>
      </div>

      <p className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
        Every announcement on chain is checked locally against your viewing key. Nothing about this
        scan is visible to anyone.
      </p>

      {error && (
        <p className="text-[12px] mb-3" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      {/* Not an error. History loaded fine; only the live feed is unavailable, which is normal on
          an RPC without filter support. Saying so beats a red banner over a working list. */}
      {liveUnavailable && !error && (
        <p className="text-[11px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          This RPC doesn&apos;t support live updates. New payments appear when you press Rescan.
        </p>
      )}

      {scanning && payments.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2">
          <Spinner label="Scanning announcements…" />
          {progress && (
            <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              block {progress.scanned.toString()} / {progress.head.toString()}
            </p>
          )}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-[12px] py-4" style={{ color: "var(--text-tertiary)" }}>
          No payments found yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {payments.map((payment) => (
            <PaymentRow
              key={payment.stealthAddress}
              payment={payment}
              keys={keys}
              settled={settled(payment)}
            />
          ))}
          {claimed > 0 && (
            <p className="text-[11px] pt-1" style={{ color: "var(--text-tertiary)" }}>
              {claimed} already claimed
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

function PaymentRow({
  payment,
  keys,
  settled,
}: {
  payment: StealthPaymentRow;
  keys: StealthKeys;
  /** Claimed, or holding only an unmovable remainder — either way there is nothing to do. */
  settled: boolean;
}) {
  const chainId = useChainId();
  const client = usePublicClient();
  const { address } = useAccount();
  const { toast } = useToast();

  const [sweeping, setSweeping] = useState(false);
  const [sweptHash, setSweptHash] = useState<Hex | null>(null);

  // Once settled, show what arrived rather than the remainder — the amount the sender sent is the
  // number the recipient recognises.
  const shown = settled ? (payment.amount ?? 0n) : (payment.balance ?? payment.amount ?? 0n);

  const claim = async () => {
    if (!client || !address || !isBotChainId(chainId)) return;
    setSweeping(true);
    try {
      // Swept to the connected wallet. That transaction is what links this stealth address to the
      // recipient — the sender still never learns where the money went, but the recipient does
      // give up the address's anonymity by moving it, which is unavoidable.
      const { hash } = await sweepStealthPayment({
        client,
        chain: botChainById(chainId),
        stealthAddress: payment.stealthAddress,
        ephemeralPublicKey: payment.ephemeralPubKey,
        keys,
        to: address,
      });
      setSweptHash(hash);
      toast("success", "Payment claimed", "Funds are on their way to your wallet.");
    } catch (err) {
      toast("error", "Claim failed", err instanceof Error ? err.message.split("\n")[0] : "");
    } finally {
      setSweeping(false);
    }
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[13px]" style={{ color: "var(--text-primary)" }}>
          {formatNativeAmount(shown, 6)} {activeBotChain.nativeCurrency.symbol}
        </p>
        <p className="font-mono text-[10px] truncate" style={{ color: "var(--text-tertiary)" }}>
          {payment.stealthAddress} · block {payment.blockNumber.toString()}
        </p>
      </div>

      {settled ? (
        <Badge variant="default">Claimed</Badge>
      ) : sweptHash ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(txUrl(chainId, sweptHash), "_blank")}
        >
          View
        </Button>
      ) : (
        <Button size="sm" loading={sweeping} onClick={claim}>
          Claim
        </Button>
      )}
    </div>
  );
}
