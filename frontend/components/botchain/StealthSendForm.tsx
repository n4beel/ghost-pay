"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress, type Hex } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { activeBotChain, isBotChainId, txUrl } from "@/lib/botchain/chain";
import { formatNativeAmount, parseNativeAmount } from "@/lib/botchain/amount";
import { getDeployment, stealthSendAbi } from "@/lib/botchain/contracts";
import { readMetaAddress } from "@/lib/botchain/registry";
import {
  generateStealthAddress,
  parseMetaAddressUri,
  type StealthMetaAddress,
  type StealthPayment,
} from "@/lib/stealth";

/**
 * Sender side of a BOT Chain stealth payment.
 *
 * The recipient can be given two ways. An ordinary address is looked up in the ERC-6538 registry,
 * which is the flow that matters — you pay someone you already know, with no prior contact. A
 * pasted meta-address covers the case where they have not registered, since registration costs gas
 * and a first-time recipient may not have any.
 */

type Stage = "idle" | "deriving" | "confirming" | "pending" | "done";

/** What the recipient field currently resolves to. */
type Resolution =
  | { kind: "idle" }
  | { kind: "resolving" }
  | { kind: "meta"; metaAddress: StealthMetaAddress; via: "registry" | "pasted" }
  | { kind: "unregistered" }
  | { kind: "invalid"; reason: string };

export default function StealthSendForm() {
  const chainId = useChainId();
  const client = usePublicClient();
  const { address } = useAccount();
  const { toast } = useToast();

  const { data: balance } = useBalance({ address, query: { enabled: Boolean(address) } });
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState("");
  const [resolution, setResolution] = useState<Resolution>({ kind: "idle" });
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [payment, setPayment] = useState<StealthPayment | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);

  const {
    isLoading: waiting,
    isSuccess: mined,
    isError: reverted,
  } = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  useEffect(() => {
    if (mined) {
      setStage("done");
      toast("success", "Payment sent", "The recipient can claim it from a one-time address.");
    }
  }, [mined, toast]);

  // A reverted or dropped transaction would otherwise leave the form spinning on "waiting for
  // confirmation" with no way back and no sign that the money never moved.
  useEffect(() => {
    if (!reverted) return;
    setStage("idle");
    setPayment(null);
    setHash(null);
    toast(
      "error",
      "Transaction failed",
      "It did not confirm on chain. Nothing was sent — check the explorer and try again.",
    );
  }, [reverted, toast]);

  // Resolve the recipient field. Debounced, because the registry lookup is a chain read on every
  // keystroke otherwise.
  useEffect(() => {
    const value = recipient.trim();
    if (!value) {
      setResolution({ kind: "idle" });
      return;
    }

    // The lookup is async, so clearing the timer is not enough: a request already in flight would
    // still land and overwrite whatever the user typed next.
    let cancelled = false;

    const timer = setTimeout(async () => {
      // A meta-address, pasted directly or as an st: URI.
      if (value.startsWith("st:") || value.length > 60) {
        try {
          setResolution({ kind: "meta", metaAddress: parseMetaAddressUri(value), via: "pasted" });
        } catch (err) {
          setResolution({
            kind: "invalid",
            reason: err instanceof Error ? err.message : "Not a stealth meta-address",
          });
        }
        return;
      }

      if (!isAddress(value)) {
        setResolution({ kind: "invalid", reason: "Not an address or stealth meta-address" });
        return;
      }
      if (!client || !isBotChainId(chainId)) return;

      setResolution({ kind: "resolving" });
      try {
        const metaAddress = await readMetaAddress(client, chainId, value);
        if (cancelled) return;
        setResolution(
          metaAddress ? { kind: "meta", metaAddress, via: "registry" } : { kind: "unregistered" },
        );
      } catch {
        if (cancelled) return;
        setResolution({ kind: "invalid", reason: "Could not reach the registry" });
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recipient, client, chainId]);

  const parsedAmount = parseNativeAmount(amount);
  const insufficient =
    parsedAmount !== null && balance !== undefined && parsedAmount > balance.value;

  const canSend =
    resolution.kind === "meta" &&
    parsedAmount !== null &&
    parsedAmount > 0n &&
    !insufficient &&
    stage === "idle";

  const handleSend = useCallback(async () => {
    if (resolution.kind !== "meta" || parsedAmount === null || !isBotChainId(chainId)) return;

    setStage("deriving");
    try {
      // A fresh ephemeral key every time. Reusing one would derive the same stealth address twice
      // and link the two payments to each other, which is the one thing this must never do.
      const derived = generateStealthAddress({
        metaAddress: resolution.metaAddress,
        amount: parsedAmount,
      });
      setPayment(derived);

      setStage("confirming");
      const sent = await writeContractAsync({
        address: getDeployment(chainId).stealthSend,
        abi: stealthSendAbi,
        functionName: "send",
        args: [derived.stealthAddress, derived.ephemeralPublicKey, derived.metadata],
        value: parsedAmount,
      });

      setHash(sent);
      setStage("pending");
    } catch (err) {
      setStage("idle");
      setPayment(null);
      toast("error", "Send failed", err instanceof Error ? shortError(err.message) : "Unknown error");
    }
  }, [resolution, parsedAmount, chainId, writeContractAsync, toast]);

  const reset = () => {
    setStage("idle");
    setPayment(null);
    setHash(null);
    setAmount("");
    setRecipient("");
    setResolution({ kind: "idle" });
  };

  if (stage === "done" && payment && hash) {
    return (
      <div className="mx-auto w-full" style={{ maxWidth: "480px" }}>
        <Panel>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="confirmed">Sent</Badge>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              Recipient unlinkable
            </span>
          </div>
          <Field label="Amount" value={`${amount} ${activeBotChain.nativeCurrency.symbol}`} />
          <Field label="One-time address" value={payment.stealthAddress} mono />
          <p className="text-[11px] mt-2 mb-4" style={{ color: "var(--text-tertiary)" }}>
            Derived from the recipient&apos;s meta-address. Nothing on chain connects it to them,
            and only they can compute the key for it.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => window.open(txUrl(chainId, hash), "_blank")}>
              View on explorer
            </Button>
            <Button size="sm" onClick={reset}>
              Send another
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  const busy = stage !== "idle";

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "480px" }}>
      <Panel>
        <div className="flex flex-col gap-5">
          <Input
            label="To"
            placeholder="0x… address or st:bot:0x… meta-address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={busy}
            mono
            hint={resolutionHint(resolution)}
            error={resolutionError(resolution)}
            suffix={
              resolution.kind === "meta" ? (
                <span style={{ color: "var(--success)" }}>✓</span>
              ) : undefined
            }
          />

          <div className="flex flex-col gap-1">
            <Input
              label={`Amount (${activeBotChain.nativeCurrency.symbol})`}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              mono
              inputMode="decimal"
              error={
                amount && parsedAmount === null
                  ? "Enter a valid amount"
                  : insufficient
                    ? "Insufficient balance"
                    : undefined
              }
            />
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {balance
                  ? `Available: ${formatNativeAmount(balance.value)} ${balance.symbol}`
                  : "Available: —"}
              </span>
            </div>
          </div>

          {busy ? (
            <div className="flex flex-col items-center py-4">
              <Spinner label={stageLabel(stage, waiting)} />
            </div>
          ) : (
            <Button disabled={!canSend} onClick={handleSend}>
              Send Privately
            </Button>
          )}

          {/* The honest version of what this hides. A listing review is exactly the audience that
              checks, so the claim on screen has to survive being checked. */}
          <div className="flex items-start gap-2 pt-1">
            <Badge variant="private">Stealth</Badge>
            <span className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Recipient unlinkable · Amount and your address stay public
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mb-3">
      <p
        className="text-[11px] uppercase tracking-[0.04em] mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono text-[12px] break-all" : "text-[13px]"}
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}

function resolutionHint(resolution: Resolution): string | undefined {
  switch (resolution.kind) {
    case "resolving":
      return "Looking up their stealth keys…";
    case "meta":
      return resolution.via === "registry"
        ? "Registered stealth keys found"
        : "Using the pasted meta-address";
    default:
      return undefined;
  }
}

function resolutionError(resolution: Resolution): string | undefined {
  switch (resolution.kind) {
    case "unregistered":
      // Not the user's mistake, and not fixable by editing the field, so it says what to do next.
      return "This address has not published stealth keys. Ask them to open Receive on Ghost Pay, or paste their meta-address instead.";
    case "invalid":
      return resolution.reason;
    default:
      return undefined;
  }
}

function stageLabel(stage: Stage, waiting: boolean): string {
  if (stage === "deriving") return "Deriving one-time address…";
  if (stage === "confirming") return "Confirm in your wallet…";
  return waiting ? "Waiting for confirmation…" : "Broadcasting…";
}

/** Wallet errors arrive as multi-paragraph dumps; the first line is the part a user can act on. */
function shortError(message: string): string {
  return message.split("\n")[0].slice(0, 200);
}
