"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUmbra } from "@/hooks/useUmbra";
import { scanAndClaimUtxos } from "@/lib/umbra/receive";
import { reverseResolveSns } from "@/lib/sns";
import { useToast } from "@/components/ui/Toast";

export default function ReceivePage() {
  const { connected, publicKey } = useWallet();
  const { client, isReady } = useUmbra();
  const { toast } = useToast();

  const [solName, setSolName] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [claimedCount, setClaimedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey) { setSolName(null); return; }
    reverseResolveSns(publicKey.toBase58()).then(setSolName);
  }, [publicKey]);

  const handleScan = async () => {
    if (!client) return;
    setScanning(true);
    try {
      const { claimed } = await scanAndClaimUtxos(client);
      setClaimedCount(claimed);
      toast(
        claimed > 0 ? "success" : "info",
        claimed > 0 ? `Claimed ${claimed} payment${claimed > 1 ? "s" : ""}` : "No new payments found",
      );
    } catch (err) {
      toast("error", "Scan failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setScanning(false);
    }
  };

  const address = publicKey?.toBase58() ?? "";
  const payLink = `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${solName ?? address}`;

  return (
    <PageShell title="Receive" description="Share your payment address or scan for pending payments">
      {!connected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect your wallet to receive.
        </p>
      ) : (
        <div className="flex flex-col gap-4" style={{ maxWidth: "480px" }}>
          {/* Address card */}
          <Panel>
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Your Payment Address
            </p>
            {solName && (
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[20px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {solName}
                </span>
                <Badge variant="confirmed">SNS</Badge>
              </div>
            )}
            <p className="font-mono text-[12px] break-all" style={{ color: "var(--text-secondary)" }}>
              {address}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(solName ?? address);
                  toast("success", "Copied to clipboard");
                }}
              >
                Copy Address
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(payLink);
                  toast("success", "Payment link copied");
                }}
              >
                Copy Pay Link
              </Button>
            </div>
          </Panel>

          {/* Scan for payments */}
          <Panel>
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Scan for Incoming Payments
            </p>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-tertiary)" }}>
              Scan the Umbra UTXO tree for payments addressed to you, then claim them to your
              encrypted balance.
            </p>

            {scanning ? (
              <div className="flex flex-col items-center py-6">
                <Spinner label="Scanning UTXO tree..." />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button disabled={!isReady} onClick={handleScan}>
                  Scan &amp; Claim
                </Button>
                {claimedCount !== null && (
                  <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    Last scan: {claimedCount === 0
                      ? "No new payments"
                      : `${claimedCount} payment${claimedCount > 1 ? "s" : ""} claimed`}
                  </p>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
