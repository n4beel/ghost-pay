"use client";

import Link from "next/link";
import Image from "next/image";
import RedactedValue from "@/components/ui/RedactedValue";

const FEATURES = [
  {
    icon: "◈",
    title: "Zero-Knowledge Privacy",
    desc: "Amounts hidden. Sender anonymous. Receiver unlinkable. ZK proofs generated in your browser — no server involved.",
  },
  {
    icon: "◉",
    title: ".sol Identity",
    desc: "Send to alice.sol — no wallet addresses to copy, paste, or mistype.",
  },
  {
    icon: "⬡",
    title: "Spend from the Vault",
    desc: "Pay directly from your encrypted balance. No unshield required. The vault is a full spending account.",
  },
  {
    icon: "◫",
    title: "Private Payroll",
    desc: "Upload a CSV. Cloak disburses to N recipients in one transaction. No one sees each other's salary.",
  },
  {
    icon: "◧",
    title: "Compliance Keys",
    desc: "Generate scoped viewing keys for auditors. Full privacy by default, selective transparency on demand.",
  },
  {
    icon: "◩",
    title: "Pay Links",
    desc: "ghost-pay.nabeelkhan.dev/pay/alice.sol — share a link, receive privately. No setup required for the sender.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Shield",
    desc: "Move tokens from your public wallet into an encrypted on-chain vault. One transaction. Done once.",
  },
  {
    n: "02",
    title: "Send",
    desc: "Pay any .sol name or address. A ZK proof debits your vault and creates a stealth UTXO for the recipient.",
  },
  {
    n: "03",
    title: "Claim",
    desc: "Recipients scan for incoming stealth UTXOs and claim them to their own encrypted vault.",
  },
  {
    n: "04",
    title: "Loop",
    desc: "Spend from the vault again. Funds circulate privately indefinitely. Unshield only to exit.",
  },
];

const SDKS = [
  "Umbra ZK",
  "Cloak",
  "MagicBlock PER",
  "Bonfida SNS",
  "Dune SIM",
  "Covalent",
  "Torque",
  "RPC Fast",
  "Palm USD",
];

const CHAIN_VIEW = [
  { label: "Sender", value: "0x????…????" },
  { label: "Recipient", value: "Stealth address" },
  { label: "Amount", value: "Encrypted" },
  { label: "On-chain link", value: "None" },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 gap-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <Image src="/ghost-32.png" alt="Ghost Pay" width={22} height={22} priority />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Ghost Pay</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <a
            href="https://github.com/n4beel/ghost-pay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            GitHub
          </a>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-[12px] font-medium uppercase tracking-[0.04em] transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--bg-base)", borderRadius: "2px" }}
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-5 sm:px-8 py-16 sm:py-24 lg:py-28 text-center overflow-hidden">
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,204,0.09) 0%, transparent 65%)",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-2xl w-full mx-auto">
          {/* Status badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 mb-8"
            style={{ border: "1px solid var(--border-subtle)", borderRadius: "2px" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--success)" }}
            />
            <span
              className="text-[11px] tracking-[0.05em] uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              Live on Mainnet · Solana
            </span>
          </div>

          <h1
            className="text-[38px] sm:text-[52px] lg:text-[64px] font-semibold tracking-[-0.04em] leading-[1.04] mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            Pay anyone.
            <br />
            <span style={{ color: "var(--accent)" }}>Reveal nothing.</span>
          </h1>

          <p
            className="text-[15px] sm:text-[17px] leading-relaxed max-w-lg mx-auto mb-10"
            style={{ color: "var(--text-secondary)" }}
          >
            A privacy-first payment layer on Solana. Amounts hidden, senders anonymous,
            receivers unlinkable. ZK proofs run entirely in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16">
            <Link
              href="/dashboard"
              className="px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.04em] transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--bg-base)", borderRadius: "2px" }}
            >
              Open App
            </Link>
            <a
              href="https://github.com/n4beel/ghost-pay"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3.5 text-[13px] font-medium uppercase tracking-[0.04em] transition-all hover:opacity-80"
              style={{
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                borderRadius: "2px",
              }}
            >
              View Source
            </a>
          </div>

          {/* Chain view vs private view */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px mx-auto text-left"
            style={{ maxWidth: "580px", background: "var(--border-subtle)" }}
          >
            {/* What the chain sees */}
            <div className="p-5" style={{ background: "var(--bg-surface)" }}>
              <p
                className="text-[10px] uppercase tracking-[0.07em] mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                What the chain sees
              </p>
              {CHAIN_VIEW.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {row.label}
                  </span>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Your private view */}
            <div className="p-5" style={{ background: "var(--bg-surface)" }}>
              <p
                className="text-[10px] uppercase tracking-[0.07em] mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                Your private view
              </p>
              <p className="text-[10px] uppercase tracking-[0.04em] mb-1" style={{ color: "var(--text-tertiary)" }}>
                Private Balance
              </p>
              <RedactedValue value="4,209.00 USDC" className="text-[26px] font-semibold font-mono" />
              <div className="mt-3">
                {[
                  { label: "Last received", value: "+2,100 USDC", color: "var(--success)" },
                  { label: "Last sent", value: "−850 USDC", color: "var(--text-secondary)" },
                  { label: "Recipient", value: "alice.sol", color: "var(--accent)" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {row.label}
                    </span>
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: row.color }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-3" style={{ color: "var(--text-tertiary)" }}>
                click balance to reveal
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core guarantees */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-px"
        style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--border-subtle)" }}
      >
        {[
          {
            label: "Non-custodial",
            desc: "Your keys never leave your browser. Ghost Pay has zero access to your funds or vault.",
          },
          {
            label: "ZK, not trust",
            desc: "Amounts are proven via zero-knowledge proof. No server, no oracle, no one knows what you sent.",
          },
          {
            label: "No address exposure",
            desc: "Send to alice.sol. The chain records only a one-time stealth address with no link to either party.",
          },
        ].map((g) => (
          <div key={g.label} className="px-5 sm:px-8 py-6 sm:py-7" style={{ background: "var(--bg-base)" }}>
            <p className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              {g.label}
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {g.desc}
            </p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <section className="px-5 sm:px-8 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <p
            className="text-[10px] uppercase tracking-[0.1em] mb-8 sm:mb-12 text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            The private loop
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px"
            style={{ background: "var(--border-subtle)" }}
          >
            {STEPS.map((step) => (
              <div key={step.n} className="p-6" style={{ background: "var(--bg-base)" }}>
                <p
                  className="text-[11px] font-mono mb-4"
                  style={{ color: "var(--accent)" }}
                >
                  {step.n}
                </p>
                <h3
                  className="text-[15px] font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="px-5 sm:px-8 pb-14 sm:pb-20"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-[10px] uppercase tracking-[0.1em] my-8 sm:my-12 text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            Everything you need
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px"
            style={{ background: "var(--border-subtle)" }}
          >
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 sm:p-7" style={{ background: "var(--bg-base)" }}>
                <div
                  className="text-xl mb-4 font-mono"
                  style={{ color: "var(--accent)" }}
                >
                  {f.icon}
                </div>
                <h3
                  className="text-[14px] font-semibold mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SDK strip */}
      <section
        className="px-5 sm:px-8 py-10"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-[10px] uppercase tracking-[0.1em] mb-6 text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            Built with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SDKS.map((sdk) => (
              <span
                key={sdk}
                className="px-3 py-1.5 text-[11px] font-mono"
                style={{
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                  borderRadius: "2px",
                }}
              >
                {sdk}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="px-5 sm:px-8 py-16 sm:py-24 text-center"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-md mx-auto">
          <h2
            className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.025em] leading-[1.1] mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Your payments.
            <br />
            <span style={{ color: "var(--accent)" }}>Your business.</span>
          </h2>
          <p
            className="text-[14px] leading-relaxed mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            Connect a wallet. Register once. Start sending privately in under 60 seconds.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.04em] transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--bg-base)", borderRadius: "2px" }}
          >
            Open Ghost Pay
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <Image src="/ghost-32.png" alt="Ghost Pay" width={14} height={14} />
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Ghost Pay · Built by{" "}
            <a
              href="https://nabeelkhan.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
            >
              Nabeel Khan
            </a>
            {" "}· Superteam Frontier Hackathon 2026 · Pakistan
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          Umbra · Cloak · MagicBlock · SNS · Dune · Covalent · Torque · RPC Fast · PUSD
        </span>
      </footer>
    </div>
  );
}
