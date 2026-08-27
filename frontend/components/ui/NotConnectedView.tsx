"use client";

import WalletControl from "./WalletControl";

interface NotConnectedViewProps {
  message?: string;
}

/**
 * The empty state every page shows before a wallet is connected — with the connect control in it.
 *
 * It used to be text alone, pointing at the sidebar. On desktop that reads fine; on a phone there
 * is no sidebar on screen, so the page asked for something the user could only do after guessing
 * that the hamburger held a wallet control. The instruction and the action now sit in the same
 * place, which is the fix for both.
 *
 * `WalletControl` rather than a bare connect button: it is the same control the sidebar renders, so
 * it always offers the right wallet for the selected chain, and it carries the chain switcher when
 * the BOT Chain flag is on. Someone who lands on the wrong chain can correct it here instead of
 * going looking for the switcher.
 */
export default function NotConnectedView({
  message = "Connect your wallet to continue.",
}: NotConnectedViewProps) {
  return (
    <div
      className="mx-auto flex flex-col items-center justify-center gap-5 text-center"
      style={{ minHeight: "40vh", maxWidth: "300px" }}
    >
      <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>

      <div className="w-full" style={{ maxWidth: "220px" }}>
        <WalletControl />
      </div>

      <p className="text-[11px] uppercase tracking-[0.04em]" style={{ color: "var(--text-tertiary)" }}>
        Phantom · Solflare · Backpack
      </p>
    </div>
  );
}
