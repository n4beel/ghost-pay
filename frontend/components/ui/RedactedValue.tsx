"use client";

import { useState } from "react";

interface RedactedValueProps {
  value: string;
  label?: string;
  className?: string;
}

export default function RedactedValue({ value, label, className = "" }: RedactedValueProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      className={["group relative inline-flex items-center gap-2 cursor-pointer", className].join(" ")}
      title={revealed ? "Click to hide" : "Click to reveal"}
    >
      <span
        className={[
          "font-mono text-[var(--text-primary)] transition-all duration-[1200ms] ease-out select-none",
          revealed ? "" : "blur-sm",
        ].join(" ")}
      >
        {revealed ? value : "████████████"}
      </span>
      <span className="text-[11px] text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors duration-120">
        {revealed ? "hide" : "reveal"}
      </span>
      {label && (
        <span className="text-[11px] text-[var(--text-secondary)] ml-1">{label}</span>
      )}
    </button>
  );
}
