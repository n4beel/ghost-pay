"use client";

import Link from "next/link";
import Image from "next/image";
import RedactedValue from "@/components/ui/RedactedValue";

const FEATURES = [
  {
    icon: "◈",
    title: "Zero-Knowledge Privacy",
    desc: "Amounts hidden. Sender anonymous. Receiver unlinkable. Powered by Umbra ZK proofs.",
  },
  {
    icon: "◉",
    title: ".sol Identity",
    desc: "Send to alice.sol — no wallet addresses to copy, paste, or mistype.",
  },
  {
    icon: "⬡",
    title: "Payroll at Scale",
    desc: "Batch private disbursements to thousands of recipients in a single transaction.",
  },
  {
    icon: "◫",
    title: "Compliance Ready",
    desc: "Generate scoped viewing keys for auditors. Full privacy by default, selective transparency on demand.",
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <Image src="/ghost-32.png" alt="Ghost Pay" width={22} height={22} priority />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Ghost Pay</span>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-[12px] font-medium uppercase tracking-[0.04em] transition-opacity hover:opacity-90"
          style={{
            background: "var(--accent)",
            color: "var(--bg-base)",
            borderRadius: "2px",
          }}
        >
          Launch App
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-8 py-24 text-center w-full">
        <div className="max-w-2xl w-full mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8"
            style={{ border: "1px solid var(--border-subtle)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            <span
              className="text-[11px] tracking-[0.04em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Mainnet · Solana
            </span>
          </div>

          <h1
            className="text-[48px] font-semibold tracking-[-0.03em] leading-[1.1] mb-5"
            style={{ color: "var(--text-primary)" }}
          >
            Pay anyone.
            <br />
            <span style={{ color: "var(--accent)" }}>Reveal nothing.</span>
          </h1>

          <p
            className="text-[16px] leading-relaxed max-w-xl mx-auto mb-10"
            style={{ color: "var(--text-secondary)" }}
          >
            Ghost Pay is a privacy-first payment layer on Solana. Send tokens with
            cryptographic privacy — amounts hidden, senders anonymous, receivers
            unlinkable. Use&nbsp;.sol names as payment addresses.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.04em] transition-opacity hover:opacity-90"
              style={{
                background: "var(--accent)",
                color: "var(--bg-base)",
                borderRadius: "2px",
              }}
            >
              Open App
            </Link>
            <a
              href="https://github.com/n4beel/ghost-pay"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-[13px] font-medium uppercase tracking-[0.04em] transition-all hover:opacity-80"
              style={{
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                borderRadius: "2px",
              }}
            >
              GitHub
            </a>
          </div>

          {/* Redacted balance preview */}
          <div
            className="mt-16 mx-auto p-5 text-left"
            style={{
              maxWidth: "320px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[11px] uppercase tracking-[0.04em] mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              Private Balance
            </p>
            <RedactedValue
              value="4,209.00 USDC"
              className="text-[32px] font-semibold"
            />
            <p className="text-[11px] mt-2" style={{ color: "var(--text-tertiary)" }}>
              Encrypted on-chain · click to reveal
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="grid grid-cols-2"
            style={{ gap: "1px", background: "var(--border-subtle)" }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="p-8" style={{ background: "var(--bg-base)" }}>
                <div className="text-2xl mb-4 font-mono" style={{ color: "var(--accent)" }}>
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {f.title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-8 py-5 flex items-center justify-between"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Ghost Pay · Solana Frontier Hackathon 2026
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Built with RPC Fast · Umbra · Cloak · MagicBlock
        </span>
      </footer>
    </div>
  );
}
