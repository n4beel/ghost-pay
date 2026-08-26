"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useUmbra } from "@/hooks/useUmbra";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useEncryptedBalance } from "@/hooks/useEncryptedBalance";
import { resolveSnsDomain, isSolDomain } from "@/lib/sns";
import { SUPPORTED_TOKENS } from "@/lib/tokens";
import { sendPrivate } from "@/lib/umbra/send";
import { sendFromVault } from "@/lib/umbra/send-from-vault";
import { TOKENS } from "@/lib/tokens";
import { useToast } from "@/components/ui/Toast";
import NotConnectedView from "@/components/ui/NotConnectedView";
import { magicBlockTransfer } from "@/lib/magicblock/client";
import { trackEvent } from "@/lib/torque/events";
import { logActivity } from "@/lib/activity-log";
import { useChain } from "@/components/providers/ChainProvider";
import BotChainGate from "@/components/botchain/BotChainGate";
import StealthSendForm from "@/components/botchain/StealthSendForm";

type Route = "umbra" | "magicblock";
type Source = "public" | "vault";
type SendStage = "idle" | "proving" | "broadcasting" | "done" | "error";

export default function SendPage() {
  const { isBotChain } = useChain();

  // Branch once at the top rather than threading a common wallet interface through the form. The
  // two chains share the visual language and nothing else: different wallets, different privacy
  // model, different failure modes.
  if (isBotChain) return <BotChainSendPage />;
  return <SolanaSendPage />;
}

function BotChainSendPage() {
  return (
    <PageShell
      title="Send"
      description="Stealth payment — a one-time address only the recipient can spend from"
    >
      <BotChainGate>
        <StealthSendForm />
      </BotChainGate>
    </PageShell>
  );
}

function SolanaSendPage() {
  const { connected, publicKey, signMessage } = useWallet();
  const { client, isReady } = useUmbra();
  const { toast } = useToast();
  const { tokens: publicTokens } = usePortfolio();
  const { balances: vaultBalances } = useEncryptedBalance(client, isReady);

  const [recipient, setRecipient] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<keyof typeof TOKENS>("USDC");
  const [route, setRoute] = useState<Route>("umbra");
  const [source, setSource] = useState<Source>("public");
  const [stage, setStage] = useState<SendStage>("idle");

  // Force public source when switching to MagicBlock route
  useEffect(() => {
    if (route === "magicblock") setSource("public");
  }, [route]);

  useEffect(() => {
    if (!recipient) { setResolvedAddress(null); return; }
    const trimmed = recipient.trim();
    if (isSolDomain(trimmed)) {
      const timer = setTimeout(async () => {
        setResolving(true);
        const addr = await resolveSnsDomain(trimmed);
        setResolvedAddress(addr);
        setResolving(false);
      }, 350);
      return () => clearTimeout(timer);
    }
    setResolvedAddress(trimmed.length >= 32 ? trimmed : null);
  }, [recipient]);

  const tokenInfo = TOKENS[token];

  const publicBalance = publicTokens.find((t) => t.mint === tokenInfo.mint)?.balance ?? null;
  const vaultEntry = vaultBalances.find((b) => b.mint === tokenInfo.mint);
  const vaultBalance = vaultEntry && !vaultEntry.mxeMode && !vaultEntry.callbackPending
    ? vaultEntry.balance
    : null;
  const vaultUnavailable = source === "vault" && vaultEntry?.mxeMode;

  const availableBalance = source === "public" ? publicBalance : vaultBalance;

  const handleMax = () => {
    if (availableBalance !== null) setAmount(String(availableBalance));
  };

  const handleSend = useCallback(async () => {
    if (!resolvedAddress || !amount) return;
    const parsed = parseFloat(amount);

    setStage("proving");
    try {
      setStage("broadcasting");

      if (route === "magicblock") {
        if (!publicKey || !signMessage) {
          throw new Error("Wallet must support signMessage for MagicBlock route");
        }
        await magicBlockTransfer(
          publicKey.toBase58(),
          resolvedAddress,
          tokenInfo.mint,
          parsed,
          signMessage,
        );
      } else {
        if (!client) throw new Error("Umbra client not ready");
        const amountLamports = BigInt(Math.round(parsed * 10 ** tokenInfo.decimals));
        if (source === "vault") {
          await sendFromVault(client, resolvedAddress, tokenInfo.mint, amountLamports);
        } else {
          await sendPrivate(client, resolvedAddress, tokenInfo.mint, amountLamports);
        }
      }

      setStage("done");
      toast("success", "Payment sent", `${amount} ${token} sent privately`);

      if (publicKey) {
        trackEvent(publicKey.toBase58(), "private_payment_sent", {
          route,
          token,
          amount: parsed,
        });
        logActivity(publicKey.toBase58(), {
          type: source === "vault" ? "send_vault" : "send",
          token,
          amount,
          timestamp: Date.now(),
        });
      }

      setAmount("");
      setRecipient("");
      setResolvedAddress(null);
      setTimeout(() => setStage("idle"), 2000);
    } catch (err) {
      setStage("error");
      toast("error", "Send failed", err instanceof Error ? err.message : "Unknown error");
      setTimeout(() => setStage("idle"), 3000);
    }
  }, [client, resolvedAddress, amount, token, route, source, toast, publicKey, signMessage, tokenInfo]);

  const canSend =
    resolvedAddress &&
    amount &&
    parseFloat(amount) > 0 &&
    !vaultUnavailable &&
    (route === "umbra" ? isReady : !!publicKey);

  const stageLabel: Record<SendStage, string> = {
    idle: "",
    proving: "Generating ZK proof...",
    broadcasting: "Broadcasting...",
    done: "Sent",
    error: "Failed",
  };

  return (
    <PageShell title="Send" description="Private payment — amounts hidden, sender anonymous">
      {!connected ? (
        <NotConnectedView message="Connect your wallet to send privately." />
      ) : (
        <div className="mx-auto w-full" style={{ maxWidth: "480px" }}>
          <Panel>
            <div className="flex flex-col gap-5">
              {/* Recipient */}
              <Input
                label="To"
                placeholder="alice.sol or wallet address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                mono
                hint={
                  resolving
                    ? "Resolving..."
                    : resolvedAddress && resolvedAddress !== recipient
                    ? `Resolved: ${resolvedAddress.slice(0, 8)}...${resolvedAddress.slice(-6)}`
                    : undefined
                }
                error={
                  recipient && !resolving && !resolvedAddress
                    ? "Address not found"
                    : undefined
                }
                suffix={
                  resolvedAddress ? (
                    <span style={{ color: "var(--success)" }}>✓</span>
                  ) : undefined
                }
              />

              {/* Source toggle (Umbra only) */}
              {route === "umbra" && (
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-[11px] font-medium uppercase tracking-[0.04em]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Source
                  </label>
                  <div className="flex gap-0" style={{ border: "1px solid var(--border-default)", borderRadius: "4px", overflow: "hidden" }}>
                    {(["public", "vault"] as Source[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSource(s)}
                        className="flex-1 py-2 text-[12px] transition-colors"
                        style={{
                          background: source === s ? "var(--accent)" : "transparent",
                          color: source === s ? "var(--bg-base)" : "var(--text-secondary)",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        {s === "public" ? "Public Wallet" : "Private Vault"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {source === "public"
                      ? "Stealth UTXO created — on-chain link between you and recipient is broken"
                      : "Debited from your encrypted vault — spend without touching your public balance"}
                  </p>
                </div>
              )}

              {/* Amount + Token */}
              <div className="flex flex-col gap-1">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      label="Amount"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      mono
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[11px] font-medium uppercase tracking-[0.04em]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Token
                    </label>
                    <select
                      value={token}
                      onChange={(e) => setToken(e.target.value as keyof typeof TOKENS)}
                      className="h-[42px] px-3 text-sm outline-none cursor-pointer"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                        borderRadius: "4px",
                      }}
                    >
                      {SUPPORTED_TOKENS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Balance row */}
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {source === "vault"
                      ? vaultUnavailable
                        ? "Vault in MXE mode — convert to shared first"
                        : vaultBalance !== null
                        ? `Vault: ${vaultBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${token}`
                        : "Vault: —"
                      : publicBalance !== null
                      ? `Available: ${publicBalance.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${token}`
                      : "Available: —"}
                  </span>
                  {availableBalance !== null && (
                    <button
                      onClick={handleMax}
                      className="text-[11px] px-1.5 py-0.5 transition-colors"
                      style={{
                        color: "var(--accent)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[11px] font-medium uppercase tracking-[0.04em]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Route
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    { id: "umbra", label: "Umbra (ZK Mixer)", desc: "Fully unlinkable" },
                    { id: "magicblock", label: "MagicBlock (PER)", desc: "Enterprise TEE" },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{ border: "1px solid var(--border-default)" }}
                    >
                      <input
                        type="radio"
                        name="route"
                        value={r.id}
                        checked={route === r.id}
                        onChange={() => setRoute(r.id as Route)}
                      />
                      <div className="flex-1">
                        <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                          {r.label}
                        </p>
                      </div>
                      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {r.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* CTA */}
              {stage === "proving" || stage === "broadcasting" ? (
                <div className="flex flex-col items-center py-4 gap-2">
                  <Spinner label={stageLabel[stage]} />
                </div>
              ) : (
                <Button
                  disabled={!canSend}
                  onClick={handleSend}
                >
                  Send Privately
                </Button>
              )}

              {/* Privacy note */}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="private">Private</Badge>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Amount hidden · Sender anonymous · Receiver unlinkable
                </span>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
