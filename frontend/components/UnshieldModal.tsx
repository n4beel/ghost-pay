"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { unshieldTokens } from "@/lib/umbra/unshield";
import { TOKENS, SUPPORTED_TOKENS, type TokenSymbol } from "@/lib/tokens";
import type { UmbraClient } from "@/lib/umbra/client";
import type { EncryptedTokenBalance } from "@/lib/umbra/balance";
import { formatBalance } from "@/lib/umbra/balance";
import { useWallet } from "@solana/wallet-adapter-react";
import { logActivity } from "@/lib/activity-log";

interface UnshieldModalProps {
  client: UmbraClient;
  encryptedBalances: EncryptedTokenBalance[];
  onSuccess?: () => void;
  trigger: React.ReactNode;
}

export default function UnshieldModal({
  client,
  encryptedBalances,
  onSuccess,
  trigger,
}: UnshieldModalProps) {
  const { toast } = useToast();
  const { publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<TokenSymbol>("USDC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const currentBalance = encryptedBalances.find((b) => b.symbol === token);

  const handleUnshield = useCallback(async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;

    const tokenInfo = TOKENS[token];
    const lamports = BigInt(Math.round(parsed * 10 ** tokenInfo.decimals));
    setLoading(true);
    try {
      await unshieldTokens(client, tokenInfo.mint, lamports);
      toast("success", "Unshielded", `${amount} ${token} returned to public balance`);
      if (publicKey) {
        logActivity(publicKey.toBase58(), { type: "unshield", token, amount, timestamp: Date.now() });
      }
      setAmount("");
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast("error", "Unshield failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [client, token, amount, toast, onSuccess]);

  const setMax = () => {
    if (currentBalance) setAmount(String(currentBalance.balance));
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
            Unshield Tokens
          </Dialog.Title>
          <Dialog.Description className="text-[12px] mb-5" style={{ color: "var(--text-secondary)" }}>
            Move tokens from your encrypted balance back to your public wallet.
          </Dialog.Description>

          <div className="flex flex-col gap-4">
            {/* Token selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
                Token
              </label>
              <div className="flex gap-2">
                {SUPPORTED_TOKENS.map((t) => {
                  const bal = encryptedBalances.find((b) => b.symbol === t);
                  return (
                    <button
                      key={t}
                      onClick={() => setToken(t)}
                      className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                      style={{
                        borderRadius: "2px",
                        border: `1px solid ${token === t ? "var(--accent)" : "var(--border-default)"}`,
                        background: token === t ? "var(--accent-dim)" : "transparent",
                        color: token === t ? "var(--accent)" : "var(--text-secondary)",
                        opacity: bal ? 1 : 0.4,
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              {currentBalance && (
                <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  Available: {formatBalance(currentBalance.balance, currentBalance.decimals)}{" "}
                  {token}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="relative">
              <Input
                label="Amount"
                placeholder="0.00"
                type="number"
                min="0"
                max={currentBalance?.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                mono
              />
              {currentBalance && (
                <button
                  onClick={setMax}
                  className="absolute right-3 top-7 text-[11px] font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  MAX
                </button>
              )}
            </div>

            {/* Actions */}
            {loading ? (
              <div className="flex justify-center py-3">
                <Spinner label="Generating ZK proof..." />
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  disabled={!amount || parseFloat(amount) <= 0 || !currentBalance}
                  onClick={handleUnshield}
                  className="flex-1"
                >
                  Unshield
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
