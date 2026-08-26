"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import Sidebar from "./Sidebar";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * App frame.
 *
 * Desktop keeps the fixed 220px rail. Below `md` the rail would leave roughly a hundred pixels of
 * content on a phone, so it collapses into a drawer behind a top bar. This is not a nice-to-have:
 * BOT Chain's own wallet ships mobile-only with no browser extension, which makes the BOT Chain
 * path a phone path. It helps the Solana side too, since Phantom and Solflare both have in-app
 * browsers.
 *
 * Height is `100dvh` rather than `100vh`. On mobile Safari and Chrome, `100vh` is the viewport with
 * the browser chrome *retracted*, so a `h-screen` layout with `overflow-hidden` pushes its own
 * footer under the address bar and the user cannot scroll to it.
 */
export default function PageShell({ children, title, description }: PageShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ height: "100dvh", background: "var(--bg-base)" }}
    >
      <div className="hidden md:flex md:w-[220px] flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <MobileTopBar open={menuOpen} onOpenChange={setMenuOpen} />

        {(title || description) && (
          <header
            className="flex-shrink-0 px-5 py-5 md:px-8 md:py-6"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            {title && (
              <h1
                className="text-[18px] md:text-[20px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--text-primary)" }}
              >
                {title}
              </h1>
            )}
            {description && (
              <p
                className="mt-1 text-[12px] md:text-[13px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {description}
              </p>
            )}
          </header>
        )}

        <div className="flex-1 p-5 md:p-8">{children}</div>
      </main>
    </div>
  );
}

/**
 * Top bar and navigation drawer, below `md` only.
 *
 * A Radix Dialog rather than a hand-rolled panel: it brings the focus trap, escape handling, scroll
 * lock and aria wiring that a drawer needs and that are easy to leave out.
 */
function MobileTopBar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div
      className="md:hidden sticky top-0 z-30 flex items-center justify-between px-5 py-3 flex-shrink-0"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
      }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/ghost-32.png" alt="" width={20} height={20} priority />
        <span
          className="text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--text-primary)" }}
        >
          Ghost Pay
        </span>
      </Link>

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Trigger asChild>
          <button
            aria-label="Open navigation"
            className="flex items-center justify-center -mr-2"
            style={{
              width: "44px",
              height: "44px",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <MenuIcon />
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: "rgba(0,0,0,0.7)" }}
          />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 md:hidden focus:outline-none"
            style={{ width: "min(280px, 85vw)" }}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Sidebar onNavigate={() => onOpenChange(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {[4, 9, 14].map((y) => (
        <line
          key={y}
          x1="1"
          y1={y}
          x2="17"
          y2={y}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      ))}
    </svg>
  );
}
