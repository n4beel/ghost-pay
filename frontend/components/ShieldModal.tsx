"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { shieldTokens } from "@/lib/umbra/shield";
import { TOKENS, SUPPORTED_TOKENS, type TokenSymbol } from "@/lib/tokens";
import type { UmbraClient } from "@/lib/umbra/client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { trackEvent } from "@/lib/torque/events";

interface ShieldModalProps {
  client: UmbraClient;
  onSuccess?: () => void;
  trigger: React.ReactNode;
}

const MIN_SOL_FOR_FEES = 0.005; // ~5000 lamports * some buffer

export default function ShieldModal({ client, onSuccess, trigger }: ShieldModalProps) {
  const { toast } = useToast();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<TokenSymbol>("USDC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  // Fetch SOL balance when dialog opens
  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && publicKey) {
      try {
        const lamports = await connection.getBalance(publicKey);
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        setSolBalance(null);
      }
    }
  }, [connection, publicKey]);

  const handleShield = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    const tokenInfo = TOKENS[token];
    const lamports = BigInt(Math.round(parsed * 10 ** tokenInfo.decimals));
    setLoading(true);
    try {
      await shieldTokens(client, tokenInfo.mint, lamports);
      toast("success", "Shielded", `${amount} ${token} moved to encrypted balance`);
      if (publicKey) trackEvent(publicKey.toBase58(), "shield_completed", { token, amount: parsed });
      setAmount("");
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[ShieldModal] shield error:", err);
      toast("error", "Shield failed", msg);
    } finally {
      setLoading(false);
    }
  }, [client, token, amount, toast, onSuccess]);

  const lowSol = solBalance !== null && solBalance < MIN_SOL_FOR_FEES;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.7)" }}
        />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 w-full max-w-md p-6 focus:outline-none"
          style={{
            transform: "translate(-50%, -50%)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
        >
          <Dialog.Title
            className="text-[16px] font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Shield Tokens
          </Dialog.Title>
          <Dialog.Description className="text-[12px] mb-5" style={{ color: "var(--text-secondary)" }}>
            Move tokens from your public wallet into your encrypted private balance.
          </Dialog.Description>

          <div className="flex flex-col gap-4">
            {/* Token selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
                Token
              </label>
              <div className="flex gap-2">
                {SUPPORTED_TOKENS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setToken(t)}
                    className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                    style={{
                      borderRadius: "2px",
                      border: `1px solid ${token === t ? "var(--accent)" : "var(--border-default)"}`,
                      background: token === t ? "var(--accent-dim)" : "transparent",
                      color: token === t ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <Input
              label="Amount"
              placeholder="0.00"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              mono
            />

            {/* Low SOL warning */}
            {lowSol && (
              <div
                className="px-3 py-2 text-[12px]"
                style={{ background: "var(--danger-dim, rgba(239,68,68,0.1))", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "2px" }}
              >
                Your SOL balance ({solBalance?.toFixed(4)}) is very low. You may not have enough to cover transaction fees (~0.005 SOL needed).
              </div>
            )}

            {/* Privacy note */}
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              ZK proof will be generated on-device. This requires a wallet signature.
            </p>

            {/* Actions */}
            {loading ? (
              <div className="flex justify-center py-3">
                <Spinner label="Shielding tokens..." />
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  disabled={!amount || parseFloat(amount) <= 0}
                  onClick={handleShield}
                  className="flex-1"
                >
                  Shield
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
