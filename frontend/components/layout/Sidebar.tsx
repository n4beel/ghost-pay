"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import WalletControl from "@/components/ui/WalletControl";
import { useChain } from "@/components/providers/ChainProvider";
import { useUmbra } from "@/hooks/useUmbra";
import { useWallet } from "@solana/wallet-adapter-react";

// `botChain: false` marks a page that has no BOT Chain implementation. Those stay visible but are
// flagged, so the nav tells the truth about what works on the selected chain instead of leading the
// user to a dead end.
const NAV_LINKS = [
  { href: "/dashboard",   label: "Dashboard",  botChain: true },
  { href: "/send",        label: "Send",       botChain: true },
  { href: "/receive",     label: "Receive",    botChain: true },
  { href: "/payroll",     label: "Payroll",    botChain: false },
  { href: "/history",     label: "History",    botChain: true },
  { href: "/compliance",  label: "Compliance", botChain: false },
  { href: "/rewards",     label: "Rewards",    botChain: false },
];

function UmbraStatusBadge() {
  const { connected } = useWallet();
  const { registrationState } = useUmbra();
  const { isBotChain } = useChain();

  // Umbra is Solana-only. Showing its registration state while BOT Chain is selected would be
  // reporting on a wallet the user is not currently using.
  if (isBotChain) return null;
  if (!connected || registrationState === "unknown") return null;

  const map: Record<string, { label: string; color: string }> = {
    checking:     { label: "Checking...",  color: "var(--warning, #f59e0b)" },
    unregistered: { label: "Not set up",   color: "var(--warning, #f59e0b)" },
    registering:  { label: "Registering", color: "var(--accent)" },
    registered:   { label: "Umbra ✓",     color: "var(--success, #10b981)" },
    error:        { label: "Umbra error",  color: "var(--danger, #ef4444)" },
  };

  const entry = map[registrationState];
  if (!entry) return null;

  return (
    <div
      className="mx-3 mb-2 px-3 py-1.5 text-[11px] font-medium"
      style={{
        border: `1px solid ${entry.color}`,
        color: entry.color,
        borderRadius: "2px",
        opacity: 0.85,
      }}
    >
      {entry.label}
    </div>
  );
}

/**
 * @param onNavigate Called when a nav link is followed. The mobile drawer uses this to close
 * itself; on desktop the sidebar is always visible and there is nothing to close.
 */
export default function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { isBotChain } = useChain();

  return (
    <aside
      // Full width inside the mobile drawer, a fixed rail on desktop.
      className="w-full md:w-[220px] flex-shrink-0 flex flex-col overflow-y-auto"
      style={{
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        height: "100%",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <Image src="/ghost-32.png" alt="Ghost Pay" width={22} height={22} priority />
          <span className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
            Ghost Pay
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col" style={{ gap: "2px" }}>
        {NAV_LINKS.map(({ href, label, botChain }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const solanaOnly = isBotChain && !botChain;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              // py-2.5 keeps the desktop rhythm; the coarse-pointer rule in globals.css raises the
              // hit area on touch devices without loosening the layout for a mouse.
              className="nav-link flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-medium transition-colors"
              style={{
                borderRadius: "2px",
                background: active ? "var(--accent-dim)" : "transparent",
                color: active
                  ? "var(--accent)"
                  : solanaOnly
                    ? "var(--text-tertiary)"
                    : "var(--text-secondary)",
              }}
            >
              <span>{label}</span>
              {solanaOnly && (
                <span
                  className="text-[9px] font-mono tracking-[0.06em] uppercase px-1 py-0.5"
                  style={{
                    border: "1px solid var(--border-default)",
                    borderRadius: "2px",
                    color: "var(--text-tertiary)",
                  }}
                  title="Solana only. BOT Chain support is being added."
                >
                  SOL
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Umbra status + Wallet */}
      <div
        className="flex flex-col pb-4 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}
      >
        <UmbraStatusBadge />
        <div className="px-4">
          <WalletControl />
        </div>
      </div>
    </aside>
  );
}
