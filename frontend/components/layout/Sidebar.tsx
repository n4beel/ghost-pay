"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";

const NAV_LINKS = [
  { href: "/dashboard",   label: "Dashboard" },
  { href: "/send",        label: "Send" },
  { href: "/receive",     label: "Receive" },
  { href: "/payroll",     label: "Payroll" },
  { href: "/history",     label: "History" },
  { href: "/compliance",  label: "Compliance" },
  { href: "/rewards",     label: "Rewards" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col overflow-y-auto"
      style={{
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        height: "100%",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-mono font-semibold tracking-tight" style={{ color: "var(--accent)" }}>
            ◎
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: "var(--text-primary)" }}>
            Ghost Pay
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col" style={{ gap: "2px" }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center px-3 py-2 text-[13px] font-medium transition-colors"
              style={{
                borderRadius: "2px",
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Wallet */}
      <div
        className="px-4 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="w-full">
          <ConnectButton />
        </div>
      </div>
    </aside>
  );
}
