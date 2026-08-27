"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { ToastProvider } from "@/components/ui/Toast";
import { UmbraProvider } from "./UmbraProvider";
import { ClaimProvider } from "./ClaimProvider";
import ChainExclusivity from "./ChainExclusivity";
import { useChain } from "./ChainProvider";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT!;
const RPC_WS_ENDPOINT = process.env.NEXT_PUBLIC_RPC_WS_ENDPOINT!;

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  // Empty array: auto-detects standard wallets (Phantom, Solflare, Backpack, etc.)
  const wallets = useMemo(() => [], []);
  const { isBotChain, hydrated } = useChain();

  // Do not silently restore a Solana session for someone working on BOT Chain. Wallets that serve
  // both chains — MetaMask among them — would otherwise reconnect on load and leave two identities
  // live at once. Held off until hydration so the persisted choice has actually been read.
  const autoConnect = hydrated && !isBotChain;

  return (
    <ConnectionProvider
      endpoint={RPC_ENDPOINT}
      config={{ wsEndpoint: RPC_WS_ENDPOINT, commitment: "confirmed" }}
    >
      <SolanaWalletProvider wallets={wallets} autoConnect={autoConnect}>
        <ToastProvider>
          <ChainExclusivity>
            <UmbraProvider>
              <ClaimProvider>
                {children}
              </ClaimProvider>
            </UmbraProvider>
          </ChainExclusivity>
        </ToastProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
