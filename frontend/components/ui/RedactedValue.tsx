"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const GLYPHS = "0123456789#$%@!&~*?";
const FRAME_MS = 40;

function maskValue(v: string): string {
  return v.replace(/[^\s]/g, "*");
}

interface RedactedValueProps {
  value: string;
  label?: string;
  className?: string;
}

export default function RedactedValue({ value, label, className = "" }: RedactedValueProps) {
  const masked = maskValue(value);
  const [displayed, setDisplayed] = useState(masked);
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopAnim() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  const runAnimation = useCallback(
    (toReveal: boolean) => {
      stopAnim();
      const from = toReveal ? masked : value;
      const to = toReveal ? value : masked;
      const len = to.length;
      let frame = 0;
      const totalFrames = Math.max(12, len * 4);

      timerRef.current = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;

        const next = to
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            const charStart = i / len;
            const charEnd = charStart + 0.35;
            if (progress > charEnd) return char;
            if (progress > charStart) return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            return from[i] ?? "*";
          })
          .join("");

        setDisplayed(next);

        if (frame >= totalFrames) {
          stopAnim();
          setDisplayed(to);
        }
      }, FRAME_MS);
    },
    [value, masked],
  );

  useEffect(() => () => stopAnim(), []);

  const toggle = () => {
    const next = !revealed;
    setRevealed(next);
    runAnimation(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        "group relative inline-flex items-center gap-2 cursor-pointer",
        className,
      ].join(" ")}
      title={revealed ? "Click to hide" : "Click to reveal"}
    >
      <span className="font-mono text-[var(--text-primary)] select-none tracking-wider">
        {displayed}
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
