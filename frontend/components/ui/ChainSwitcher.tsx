"use client";

import { useChain, type ActiveChain } from "@/components/providers/ChainProvider";

const OPTIONS: { value: ActiveChain; label: string }[] = [
  { value: "solana", label: "Solana" },
  { value: "botchain", label: "BOT" },
];

/**
 * Two-up segmented control above the connect button. Matches the existing visual language:
 * 2px radii, hairline borders, cyan accent for the active segment.
 */
export default function ChainSwitcher() {
  const { activeChain, setActiveChain } = useChain();

  return (
    <div
      className="w-full flex mb-2"
      role="group"
      aria-label="Select network"
      style={{
        border: "1px solid var(--border-default)",
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      {OPTIONS.map(({ value, label }) => {
        const active = activeChain === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setActiveChain(value)}
            aria-pressed={active}
            className="flex-1 px-2 py-1.5 text-[11px] font-medium tracking-[0.04em] uppercase cursor-pointer transition-colors"
            style={{
              background: active ? "var(--accent-dim)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-tertiary)",
              border: "none",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
