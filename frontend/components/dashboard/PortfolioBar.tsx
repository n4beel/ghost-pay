"use client";

import type { PublicTokenBalance } from "@/hooks/usePortfolio";

interface PortfolioBarProps {
  tokens: PublicTokenBalance[];
  totalUsd: number;
}

const TOKEN_COLORS: Record<string, string> = {
  USDC: "#2775CA",
  USDT: "#26A17B",
  SOL: "#9945FF",
  wSOL: "#9945FF",
  PUSD: "#00E5CC",
};

function getColor(symbol: string): string {
  return TOKEN_COLORS[symbol] ?? "#888888";
}

export default function PortfolioBar({ tokens, totalUsd }: PortfolioBarProps) {
  if (totalUsd === 0 || tokens.length === 0) return null;

  const sorted = [...tokens].sort((a, b) => b.usdValue - a.usdValue).slice(0, 5);

  return (
    <div className="flex flex-col gap-2">
      {/* Bar */}
      <div className="flex w-full overflow-hidden" style={{ height: "6px", borderRadius: "3px", gap: "1px" }}>
        {sorted.map((t) => {
          const pct = (t.usdValue / totalUsd) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={t.mint}
              style={{
                width: `${pct}%`,
                background: getColor(t.symbol),
                borderRadius: "2px",
                flexShrink: 0,
              }}
              title={`${t.symbol}: $${t.usdValue.toFixed(2)}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {sorted.map((t) => (
          <div key={t.mint} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: getColor(t.symbol) }}
            />
            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              {t.symbol}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {((t.usdValue / totalUsd) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
