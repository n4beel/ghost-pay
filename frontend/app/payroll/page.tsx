"use client";

import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";

export default function PayrollPage() {
  const { connected } = useWallet();

  return (
    <PageShell
      title="Payroll"
      description="Batch private disbursements via Cloak — one transaction, multiple private recipients"
    >
      {!connected ? (
        <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
          Connect your wallet to use payroll.
        </p>
      ) : (
        <div className="flex flex-col gap-4" style={{ maxWidth: "640px" }}>
          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Upload Payroll CSV
              </p>
              <Badge variant="private">Cloak</Badge>
            </div>
            <p className="text-[12px] mb-5" style={{ color: "var(--text-secondary)" }}>
              Upload a CSV with columns:{" "}
              <span className="font-mono">name, wallet_or_sol_name, amount</span>. Each recipient
              gets a private UTXO. All disbursements happen in a single transaction.
            </p>

            <div
              className="p-10 text-center cursor-pointer transition-colors"
              style={{
                border: "2px dashed var(--border-default)",
                borderRadius: "2px",
              }}
            >
              <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>
                Drag &amp; drop CSV or click to browse
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                name, wallet_or_sol_name, amount
              </p>
            </div>

            <div className="mt-4">
              <Button disabled>Send Payroll</Button>
            </div>
          </Panel>

          <Panel elevated>
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              CSV Format Example
            </p>
            <pre
              className="font-mono text-[11px] leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >{`name,wallet_or_sol_name,amount
Alice,alice.sol,500
Bob,7xKq...m9Rd,1000
Carol,carol.sol,750`}</pre>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
