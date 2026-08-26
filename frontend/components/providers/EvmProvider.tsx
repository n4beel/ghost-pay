"use client";

import { useMemo } from "react";
import { WagmiProvider, createConfig, http, cookieStorage, createStorage } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { botChain, bohrTestnet } from "@/lib/botchain/chain";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

/**
 * EVM wallet stack for the BOT Chain path.
 *
 * Bo Wallet, BOT Chain's native wallet, is a mobile app with no browser extension. That leaves two
 * ways to reach it, and configuring both connectors covers either without needing to know in
 * advance which it supports:
 *
 *   injected()      - MetaMask on desktop, and Bo Wallet's in-app dApp browser, where the webview
 *                     injects a provider like any extension would.
 *   walletConnect() - Bo Wallet on a phone paired to a desktop page over QR.
 *
 * WalletConnect is only registered when a project ID is present, so a missing env var degrades to
 * injected-only rather than throwing at module load.
 */
function buildConfig() {
  const connectors = [
    injected({ shimDisconnect: true }),
    ...(WC_PROJECT_ID
      ? [
          walletConnect({
            projectId: WC_PROJECT_ID,
            showQrModal: true,
            metadata: {
              name: "Ghost Pay",
              description: "Private payments. Pay anyone, reveal nothing.",
              url: "https://ghost-pay.nabeelkhan.dev",
              icons: ["https://ghost-pay.nabeelkhan.dev/ghost-256.png"],
            },
          }),
        ]
      : []),
  ];

  return createConfig({
    chains: [botChain, bohrTestnet],
    connectors,
    // EIP-6963 discovery, so multiple installed wallets are listed separately instead of fighting
    // over window.ethereum.
    multiInjectedProviderDiscovery: true,
    ssr: true,
    storage: createStorage({ storage: cookieStorage }),
    transports: {
      [botChain.id]: http(),
      [bohrTestnet.id]: http(),
    },
  });
}

export function EvmProvider({ children }: { children: React.ReactNode }) {
  const config = useMemo(buildConfig, []);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Chain reads are cheap and the app is not chatty. Keep data fresh enough that a
            // balance does not look stale after a send.
            staleTime: 10_000,
            retry: 2,
          },
        },
      }),
    [],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
