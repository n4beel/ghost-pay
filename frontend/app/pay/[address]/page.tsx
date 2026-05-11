"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUmbra } from "@/hooks/useUmbra";
import { resolveSnsDomain, isSolDomain } from "@/lib/sns";
import { sendPrivate } from "@/lib/umbra/send";
import { TOKENS, SUPPORTED_TOKENS } from "@/lib/tokens";
import { useToast } from "@/components/ui/Toast";
import ConnectButton from "@/components/ui/ConnectButton";

type SendStage = "idle" | "proving" | "broadcasting" | "done" | "error";

export default function PayPage() {
  const params = useParams();
  const rawAddress = decodeURIComponent(String(params.address ?? ""));
  const { connected } = useWallet();
  const { client, isReady } = useUmbra();
  const { toast } = useToast();

  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(rawAddress);
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<keyof typeof TOKENS>("USDC");
  const [stage, setStage] = useState<SendStage>("idle");

  // Resolve SNS name or pass through raw address
  useEffect(() => {
    if (!rawAddress) return;
    if (isSolDomain(rawAddress)) {
      setDisplayName(rawAddress);
      resolveSnsDomain(rawAddress).then((addr) => {
        setResolvedAddress(addr);
        if (!addr) setDisplayName(`${rawAddress} (not found)`);
      });
    } else {
      setResolvedAddress(rawAddress);
      setDisplayName(rawAddress.length > 20 ? `${rawAddress.slice(0, 6)}...${rawAddress.slice(-4)}` : rawAddress);
    }
  }, [rawAddress]);

  const handleSend = useCallback(async () => {
    if (!client || !resolvedAddress || !amount) return;
    const tokenInfo = TOKENS[token];
    const lamports = BigInt(Math.round(parseFloat(amount) * 10 ** tokenInfo.decimals));

    setStage("proving");
    try {
      setStage("broadcasting");
      await sendPrivate(client, resolvedAddress, tokenInfo.mint, lamports);
      setStage("done");
      toast("success", "Sent!", `${amount} ${token} sent privately to ${displayName}`);
    } catch (err) {
      setStage("error");
      toast("error", "Send failed", err instanceof Error ? err.message : "Unknown error");
      setTimeout(() => setStage("idle"), 3000);
    }
  }, [client, resolvedAddress, amount, token, displayName, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: "var(--bg-base)" }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <Image src="/ghost-32.png" alt="Ghost Pay" width={22} height={22} priority />
        <span className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>Ghost Pay</span>
      </Link>

      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Panel>
          {/* Recipient header */}
          <div
            className="flex items-center gap-3 pb-4 mb-5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center font-mono text-lg font-semibold flex-shrink-0"
              style={{ background: "var(--accent-dim)", color: "var(--accent)", borderRadius: "2px" }}
            >
              {displayName[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {displayName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="private">Private</Badge>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Amount stays hidden
                </span>
              </div>
            </div>
          </div>

          {stage === "done" ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                ✓
              </div>
              <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Payment sent!
              </p>
              <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                {amount} {token} sent privately to {displayName}
              </p>
              <Button variant="ghost" onClick={() => { setStage("idle"); setAmount(""); }}>
                Send another
              </Button>
            </div>
          ) : !connected ? (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-center" style={{ color: "var(--text-secondary)" }}>
                Connect your wallet to send a private payment
              </p>
              <ConnectButton />
              <p className="text-[11px] text-center" style={{ color: "var(--text-tertiary)" }}>
                Phantom · Solflare · Backpack
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Amount + Token */}
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

              {/* CTA */}
              {stage === "proving" || stage === "broadcasting" ? (
                <div className="flex flex-col items-center py-4">
                  <Spinner label={stage === "proving" ? "Generating ZK proof..." : "Broadcasting..."} />
                </div>
              ) : (
                <Button
                  disabled={
                    !isReady || !resolvedAddress || !amount || parseFloat(amount) <= 0
                  }
                  onClick={handleSend}
                >
                  Send Privately
                </Button>
              )}

              {!isReady && (
                <p className="text-[12px] text-center" style={{ color: "var(--text-secondary)" }}>
                  Complete Umbra registration on the{" "}
                  <Link href="/dashboard" style={{ color: "var(--accent)" }}>
                    dashboard
                  </Link>{" "}
                  first
                </p>
              )}

              {/* Privacy note */}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="private">Private</Badge>
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Amount hidden · Sender anonymous
                </span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <p className="mt-8 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        Powered by Ghost Pay · Umbra ZK · Solana
      </p>
    </div>
  );
}
