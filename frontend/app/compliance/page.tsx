"use client";

import { useState } from "react";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUmbra } from "@/hooks/useUmbra";
import { issueComplianceGrant, revokeComplianceGrant } from "@/lib/umbra/compliance";
import { useToast } from "@/components/ui/Toast";

export default function CompliancePage() {
  const { connected } = useWallet();
  const { client, isReady } = useUmbra();
  const { toast } = useToast();

  const [auditorAddress, setAuditorAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleIssue = async () => {
    if (!client || !auditorAddress) return;
    setLoading(true);
    try {
      await issueComplianceGrant(client, auditorAddress);
      toast("success", "Compliance grant issued", "Auditor can now view your transaction history");
      setAuditorAddress("");
    } catch (err) {
      toast("error", "Failed to issue grant", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!client || !auditorAddress) return;
    setLoading(true);
    try {
      await revokeComplianceGrant(client, auditorAddress);
      toast("success", "Grant revoked");
      setAuditorAddress("");
    } catch (err) {
      toast("error", "Failed to revoke grant", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Compliance"
      description="Issue scoped viewing keys for auditors — privacy by default, transparency on demand"
    >
      {!connected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect your wallet to manage compliance grants.
        </p>
      ) : (
        <div className="flex flex-col gap-4" style={{ maxWidth: "480px" }}>
          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Issue Viewing Key
              </p>
              <Badge variant="private">Umbra</Badge>
            </div>
            <p className="text-[12px] mb-5" style={{ color: "var(--text-secondary)" }}>
              Grant an auditor cryptographic access to your transaction history. The grant is
              hierarchical: master → mint → yearly → monthly → daily. You can revoke at any time.
            </p>

            <Input
              label="Auditor Address"
              placeholder="Wallet address or .sol name"
              value={auditorAddress}
              onChange={(e) => setAuditorAddress(e.target.value)}
              mono
            />

            <div className="flex gap-3 mt-4">
              <Button
                disabled={!isReady || !auditorAddress || loading}
                loading={loading}
                onClick={handleIssue}
              >
                Issue Grant
              </Button>
              <Button
                variant="ghost"
                disabled={!isReady || !auditorAddress || loading}
                onClick={handleRevoke}
              >
                Revoke
              </Button>
            </div>
          </Panel>

          <Panel elevated>
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              About Viewing Keys
            </p>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <p>• Master key: full transaction history</p>
              <p>• Yearly key: all transactions in a year</p>
              <p>• Monthly key: one calendar month</p>
              <p>• Daily key: a single day</p>
              <p>• Mint key: one specific token only</p>
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
