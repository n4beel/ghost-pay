"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Button from "./Button";
import { reverseResolveSns } from "@/lib/sns";

function truncate(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectButton() {
  const { publicKey, connected, connecting, disconnect, select, wallets } = useWallet();
  const [solName, setSolName] = useState<string | null>(null);
  const [showWallets, setShowWallets] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!publicKey) { setSolName(null); return; }
    let cancelled = false;
    reverseResolveSns(publicKey.toBase58()).then((name) => {
      if (!cancelled) setSolName(name);
    });
    return () => { cancelled = true; };
  }, [publicKey]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setSolName(null);
  }, [disconnect]);

  if (!mounted) {
    return (
      <button
        className="w-full px-3 py-1.5 text-[11px] font-medium tracking-[0.02em] uppercase"
        style={{ borderRadius: "2px", border: "1px solid var(--border-default)", color: "var(--text-secondary)", background: "transparent" }}
        disabled
      >
        Connect Wallet
      </button>
    );
  }

  if (connecting) {
    return (
      <Button variant="ghost" size="sm" loading className="w-full">
        Connecting
      </Button>
    );
  }

  if (connected && publicKey) {
    const label = solName ?? truncate(publicKey.toBase58());
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors"
            style={{
              borderRadius: "2px",
              border: "1px solid var(--border-default)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--success)" }} />
            <span className="font-mono text-[12px] truncate" style={{ color: "var(--text-primary)" }}>
              {label}
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="mt-1 w-48 overflow-hidden z-50"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "2px",
            }}
          >
            <DropdownMenu.Item
              className="px-4 py-2.5 text-[13px] cursor-pointer outline-none transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
            >
              Copy address
            </DropdownMenu.Item>
            <DropdownMenu.Separator style={{ height: "1px", background: "var(--border-subtle)" }} />
            <DropdownMenu.Item
              className="px-4 py-2.5 text-[13px] cursor-pointer outline-none transition-colors"
              style={{ color: "var(--danger)" }}
              onClick={handleDisconnect}
            >
              Disconnect
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  }

  // Not connected — show wallet selector
  const installableWallets = wallets.filter((w) => w.readyState !== "NotDetected");

  if (installableWallets.length === 0) {
    return (
      <Button size="sm" className="w-full" onClick={() => window.open("https://phantom.app", "_blank")}>
        Install Phantom
      </Button>
    );
  }

  if (!showWallets && installableWallets.length === 1) {
    return (
      <Button size="sm" className="w-full" onClick={() => { select(installableWallets[0].adapter.name); }}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu.Root open={showWallets} onOpenChange={setShowWallets}>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" className="w-full">Connect Wallet</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="mt-1 w-52 overflow-hidden z-50"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "2px",
          }}
        >
          {wallets.map((w) => (
            <DropdownMenu.Item
              key={w.adapter.name}
              className="flex items-center gap-3 px-4 py-2.5 text-[13px] cursor-pointer outline-none transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => { select(w.adapter.name); setShowWallets(false); }}
            >
              {w.adapter.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.adapter.icon} alt="" width={16} height={16} className="rounded-sm" />
              )}
              {w.adapter.name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
