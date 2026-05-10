"use client";

interface NotConnectedViewProps {
  message?: string;
}

export default function NotConnectedView({ message = "Connect your wallet to continue." }: NotConnectedViewProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center" style={{ minHeight: "40vh" }}>
      <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
        {message}
      </p>
      <p className="text-[11px] uppercase tracking-[0.04em]" style={{ color: "var(--text-tertiary)" }}>
        Phantom · Solflare · Backpack
      </p>
    </div>
  );
}
