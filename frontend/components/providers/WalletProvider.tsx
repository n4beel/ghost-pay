"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { ToastProvider } from "@/components/ui/Toast";
import { UmbraProvider } from "./UmbraProvider";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT!;
const RPC_WS_ENDPOINT = process.env.NEXT_PUBLIC_RPC_WS_ENDPOINT!;

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  // Empty array: auto-detects standard wallets (Phantom, Solflare, Backpack, etc.)
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider
      endpoint={RPC_ENDPOINT}
      config={{ wsEndpoint: RPC_WS_ENDPOINT, commitment: "confirmed" }}
    >
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <ToastProvider>
          <UmbraProvider>
            {children}
          </UmbraProvider>
        </ToastProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
