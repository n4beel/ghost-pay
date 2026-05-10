interface SpinnerProps {
  size?: number;
  label?: string;
}

export default function Spinner({ size = 32, label = "Generating proof..." }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border border-[var(--border-default)]"
        />
        {/* Radar sweep arm */}
        <div
          className="radar-sweep absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 270deg, var(--accent) 360deg)`,
          }}
        />
        {/* Center dot */}
        <div className="radar-ping absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full bg-[var(--accent)]"
            style={{ width: size * 0.15, height: size * 0.15 }}
          />
        </div>
      </div>
      {label && (
        <p className="text-[12px] text-[var(--text-secondary)] tracking-[0.04em] uppercase">
          {label}
        </p>
      )}
    </div>
  );
}
