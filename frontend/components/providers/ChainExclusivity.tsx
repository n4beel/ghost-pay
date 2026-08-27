"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAccount, useDisconnect } from "wagmi";
import { useChain } from "./ChainProvider";

/**
 * One chain at a time. Never both.
 *
 * Ghost Pay speaks two chains through two entirely separate wallet stacks, and nothing stopped both
 * from being connected at once. That is not a cosmetic problem in a privacy product:
 *
 *  - A wallet app that serves both chains — MetaMask now does — can have the Solana adapter
 *    silently auto-reconnect while the user is working on BOT Chain, leaving a live session and a
 *    visible identity for a chain they are not using.
 *  - `UmbraProvider` initialises the moment a Solana wallet appears, which means signature prompts
 *    and on-chain registration reads for a chain the user has switched away from.
 *  - Two connected identities on screen invites paying from the wrong one.
 *
 * This component is the single enforcement point. It sits inside both wallet providers, so it is
 * the only place that can see and act on both, and it runs on every change rather than only on the
 * switcher's click — an auto-reconnect has to be undone too, not just a deliberate connect.
 */
export default function ChainExclusivity({ children }: { children: React.ReactNode }) {
  const { activeChain, hydrated } = useChain();
  const { connected: solanaConnected, disconnect: disconnectSolana } = useWallet();
  const { isConnected: evmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  useEffect(() => {
    // Before hydration `activeChain` is always the Solana default, so acting here would disconnect
    // the EVM wallet of every BOT Chain user on every page load.
    if (!hydrated) return;

    if (activeChain === "botchain" && solanaConnected) {
      void disconnectSolana().catch(() => {
        // The adapter throws if the wallet is already gone. Nothing to recover.
      });
    }

    if (activeChain === "solana" && evmConnected) {
      disconnectEvm();
    }
  }, [
    activeChain,
    hydrated,
    solanaConnected,
    evmConnected,
    disconnectSolana,
    disconnectEvm,
  ]);

  return <>{children}</>;
}
