"use client";

import { useState, useRef, useCallback } from "react";
import PageShell from "@/components/layout/PageShell";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useWallet } from "@solana/wallet-adapter-react";
import NotConnectedView from "@/components/ui/NotConnectedView";
import { resolveSnsDomain, isSolDomain } from "@/lib/sns";
import { disbursePayroll, type PayrollRecipient, type PayrollResult } from "@/lib/cloak/payroll";
import { useToast } from "@/components/ui/Toast";
import { trackEvent } from "@/lib/torque/events";
import { logActivity } from "@/lib/activity-log";

interface ParsedRow {
  name: string;
  rawAddress: string;
  resolvedAddress: string | null;
  amount: number;
  error?: string;
}

function parseCSV(text: string): Array<{ name: string; rawAddress: string; amount: number; error?: string }> {
  const lines = text.trim().split("\n");
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",").map((p) => p.trim());
    if (i === 0 && parts[0].toLowerCase() === "name") continue; // skip header
    if (parts.length < 3) {
      rows.push({ name: parts[0] ?? `Row ${i + 1}`, rawAddress: parts[1] ?? "", amount: 0, error: "Missing columns" });
      continue;
    }
    const amount = parseFloat(parts[2]);
    if (isNaN(amount) || amount <= 0) {
      rows.push({ name: parts[0], rawAddress: parts[1], amount: 0, error: "Invalid amount" });
      continue;
    }
    rows.push({ name: parts[0], rawAddress: parts[1], amount });
  }
  return rows;
}

function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

export default function PayrollPage() {
  const { connected, publicKey, wallet } = useWallet();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [resolving, setResolving] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number; name: string } | null>(null);
  const [results, setResults] = useState<PayrollResult[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      toast("error", "Empty CSV", "No valid rows found");
      return;
    }
    setResults(null);
    setResolving(true);
    const resolved: ParsedRow[] = await Promise.all(
      parsed.map(async (row) => {
        if (row.error) return { ...row, resolvedAddress: null };
        if (isSolDomain(row.rawAddress)) {
          const addr = await resolveSnsDomain(row.rawAddress);
          return {
            ...row,
            resolvedAddress: addr,
            error: addr ? undefined : `Could not resolve ${row.rawAddress}`,
          };
        }
        if (!isValidSolanaAddress(row.rawAddress)) {
          return { ...row, resolvedAddress: null, error: "Invalid address" };
        }
        return { ...row, resolvedAddress: row.rawAddress };
      }),
    );
    setRows(resolved);
    setResolving(false);
  }, [toast]);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast("error", "Invalid file", "Please upload a .csv file");
      return;
    }
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const validRows = rows.filter((r) => !r.error && r.resolvedAddress);
  const totalAmount = validRows.reduce((sum, r) => sum + r.amount, 0);

  const handleSend = async () => {
    if (!publicKey || !wallet?.adapter || validRows.length === 0) return;
    setSending(true);
    setProgress(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = wallet.adapter as any;
    if (typeof adapter.signTransaction !== "function") {
      toast("error", "Wallet not supported", "Wallet must support signTransaction");
      setSending(false);
      return;
    }
    if (typeof adapter.signMessage !== "function") {
      toast("error", "Wallet not supported", "Wallet must support signMessage (required for Cloak viewing key)");
      setSending(false);
      return;
    }

    const recipients: PayrollRecipient[] = validRows.map((r) => ({
      name: r.name,
      wallet: r.resolvedAddress!,
      amount: r.amount,
    }));

    try {
      const payrollResults = await disbursePayroll(
        recipients,
        publicKey.toBase58(),
        (tx) => adapter.signTransaction(tx),
        (msg) => adapter.signMessage(msg),
        (phase, index, total, name) => setProgress({ index, total, name: phase === "depositing" ? "Depositing…" : name }),
      );
      setResults(payrollResults);
      const succeeded = payrollResults.filter((r) => r.status === "success").length;
      toast(
        succeeded === payrollResults.length ? "success" : "info",
        `${succeeded}/${payrollResults.length} disbursements complete`,
      );
      trackEvent(publicKey.toBase58(), "payroll_executed", {
        amount: totalAmount,
        token: "USDC",
        route: "cloak",
      });
      logActivity(publicKey.toBase58(), {
        type: "payroll",
        token: "USDC",
        amount: String(totalAmount),
        timestamp: Date.now(),
      });
    } catch (err) {
      toast("error", "Payroll failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  return (
    <PageShell
      title="Payroll"
      description="Batch private disbursements via Cloak — shield funds, route privately, deliver to recipients"
    >
      {!connected ? (
        <NotConnectedView message="Connect your wallet to use payroll." />
      ) : (
        <div className="flex flex-col gap-4 mx-auto w-full" style={{ maxWidth: "640px" }}>
          <Panel>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Upload Payroll CSV
              </p>
              <Badge variant="private">Cloak</Badge>
            </div>
            <p className="text-[12px] mb-5" style={{ color: "var(--text-secondary)" }}>
              Each recipient receives USDC via Cloak&apos;s UTXO pool — funds are shielded in, then
              withdrawn to their wallet. The on-chain link between sender and receiver is broken.
            </p>

            <div
              className="p-10 text-center cursor-pointer transition-colors"
              style={{
                border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border-default)"}`,
                borderRadius: "2px",
                background: dragOver ? "var(--accent-dim)" : "transparent",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>
                {resolving ? "Resolving addresses…" : "Drag & drop CSV or click to browse"}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                name, wallet_or_sol_name, amount (USDC)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </Panel>

          {rows.length > 0 && !results && (
            <Panel noPadding>
              <div
                className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                    Preview — {validRows.length} recipient{validRows.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Total: {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={validRows.length === 0 || sending}
                  loading={sending}
                  onClick={handleSend}
                >
                  {sending && progress
                    ? `Sending ${progress.index + 1}/${progress.total}…`
                    : `Send Payroll`}
                </Button>
              </div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                  style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]" style={{ color: row.error ? "var(--danger)" : "var(--text-primary)" }}>
                      {row.name}
                    </p>
                    <p className="font-mono text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                      {row.resolvedAddress ?? row.rawAddress}
                      {row.error && ` — ${row.error}`}
                    </p>
                  </div>
                  <span className="font-mono text-[12px] flex-shrink-0" style={{ color: row.error ? "var(--text-tertiary)" : "var(--text-primary)" }}>
                    {row.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </span>
                  <span
                    className="text-[11px] w-14 text-right flex-shrink-0"
                    style={{ color: row.error ? "var(--danger)" : "var(--accent)" }}
                  >
                    {row.error ? "Error" : "Ready"}
                  </span>
                </div>
              ))}
            </Panel>
          )}

          {results && (
            <Panel noPadding>
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                  Results — {results.filter((r) => r.status === "success").length}/{results.length} sent
                </p>
              </div>
              {results.map((result, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3"
                  style={{ borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>
                      {result.name}
                    </p>
                    {result.status === "success" ? (
                      <a
                        href={`https://solscan.io/tx/${result.signature}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] truncate block"
                        style={{ color: "var(--accent)" }}
                      >
                        {result.signature.slice(0, 20)}…
                      </a>
                    ) : (
                      <p className="text-[11px]" style={{ color: "var(--danger)" }}>
                        {result.error}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[12px] flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {result.amount.toFixed(2)} USDC
                  </span>
                  <span
                    className="text-[11px] w-14 text-right flex-shrink-0"
                    style={{ color: result.status === "success" ? "var(--accent)" : "var(--danger)" }}
                  >
                    {result.status === "success" ? "Sent" : "Failed"}
                  </span>
                </div>
              ))}
              <div className="px-5 py-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setRows([]); setResults(null); }}
                >
                  New Payroll
                </Button>
              </div>
            </Panel>
          )}

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
