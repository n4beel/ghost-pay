"use client";

import { useState, useEffect, useCallback } from "react";
import PageShell from "@/components/layout/PageShell";
import { useChain } from "@/components/providers/ChainProvider";
import SolanaOnlyNotice from "@/components/botchain/SolanaOnlyNotice";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUmbra } from "@/hooks/useUmbra";
import {
  issueComplianceGrant,
  revokeStoredGrant,
  loadStoredGrants,
  type StoredGrant,
} from "@/lib/umbra/compliance";
import { resolveSnsDomain, isSolDomain } from "@/lib/sns";
import { useToast } from "@/components/ui/Toast";
import NotConnectedView from "@/components/ui/NotConnectedView";
import { trackEvent } from "@/lib/torque/events";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function CompliancePage() {
  const { isBotChain } = useChain();

  // Solana-only. Rendering its connect prompt on BOT Chain would invite a second
  // wallet connection the app deliberately prevents.
  if (isBotChain) {
    return (
      <PageShell title="Compliance" description="Scoped viewing keys for auditors">
        <SolanaOnlyNotice feature="Compliance keys" />
      </PageShell>
    );
  }

  return <SolanaCompliancePage />;
}

function SolanaCompliancePage() {
  const { connected, publicKey } = useWallet();
  const { client, isReady } = useUmbra();
  const { toast } = useToast();

  const [auditorAddress, setAuditorAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [grants, setGrants] = useState<StoredGrant[]>([]);

  const refreshGrants = useCallback(() => {
    if (!publicKey) return;
    setGrants(loadStoredGrants(publicKey.toBase58()));
  }, [publicKey]);

  useEffect(() => {
    refreshGrants();
  }, [refreshGrants]);

  const handleIssue = async () => {
    if (!client || !auditorAddress.trim()) return;
    setLoading(true);
    try {
      let resolvedAddress = auditorAddress.trim();
      if (isSolDomain(resolvedAddress)) {
        const resolved = await resolveSnsDomain(resolvedAddress);
        if (!resolved) throw new Error(`Could not resolve ${resolvedAddress}`);
        resolvedAddress = resolved;
      }
      await issueComplianceGrant(client, resolvedAddress);
      toast("success", "Viewing key issued", "Auditor can now request re-encryption of your transaction history");
      if (publicKey) trackEvent(publicKey.toBase58(), "compliance_grant_issued", { route: "umbra" });
      setAuditorAddress("");
      refreshGrants();
    } catch (err) {
      toast("error", "Failed to issue grant", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (grant: StoredGrant) => {
    if (!client) return;
    const key = `${grant.receiver}_${grant.nonce}`;
    setRevoking(key);
    try {
      await revokeStoredGrant(client, grant);
      toast("success", "Grant revoked");
      refreshGrants();
    } catch (err) {
      toast("error", "Failed to revoke grant", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <PageShell
      title="Compliance"
      description="Issue scoped viewing keys for auditors — privacy by default, transparency on demand"
    >
      {!connected ? (
        <NotConnectedView message="Connect your wallet to manage compliance grants." />
      ) : (
        <div className="flex flex-col gap-4 mx-auto w-full" style={{ maxWidth: "560px" }}>
          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Issue Viewing Key
              </p>
              <Badge variant="private">Umbra</Badge>
            </div>
            <p className="text-[12px] mb-5" style={{ color: "var(--text-secondary)" }}>
              Grant an auditor cryptographic access to your transaction history. The grant authorises
              Arcium MPC re-encryption from your X25519 key to the auditor&apos;s. You can revoke at any
              time.
            </p>

            <Input
              label="Auditor Address"
              placeholder="Wallet address or .sol name"
              value={auditorAddress}
              onChange={(e) => setAuditorAddress(e.target.value)}
              mono
            />

            <div className="mt-4">
              <Button
                disabled={!isReady || !auditorAddress.trim() || loading}
                loading={loading}
                onClick={handleIssue}
              >
                Issue Grant
              </Button>
            </div>
          </Panel>

          {grants.length > 0 && (
            <Panel noPadding>
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  Active Grants
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {grants.length} grant{grants.length > 1 ? "s" : ""} issued
                </p>
              </div>
              {grants.map((grant, i) => {
                const key = `${grant.receiver}_${grant.nonce}`;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                    style={{
                      borderBottom: i < grants.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[12px]" style={{ color: "var(--text-primary)" }}>
                        {truncate(grant.receiver)}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {timeAgo(grant.issuedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={revoking === key}
                      onClick={() => handleRevoke(grant)}
                    >
                      {revoking === key ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          Revoking…
                        </span>
                      ) : "Revoke"}
                    </Button>
                  </div>
                );
              })}
            </Panel>
          )}

          <Panel elevated>
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              How It Works
            </p>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <p>• Grant authorises Arcium MPC to re-encrypt your shared ciphertexts to the auditor&apos;s X25519 key</p>
              <p>• The auditor can request re-encryption without you being online</p>
              <p>• Your private key is never exposed — re-encryption happens inside MPC</p>
              <p>• Revoke at any time to remove on-chain access</p>
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
