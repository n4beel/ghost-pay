"use client";

import { useChain } from "@/components/providers/ChainProvider";
import ChainSwitcher from "./ChainSwitcher";
import ConnectButton from "./ConnectButton";
import EvmConnectButton from "./EvmConnectButton";

const BOTCHAIN_ENABLED = process.env.NEXT_PUBLIC_BOTCHAIN_ENABLED === "true";

/**
 * The sidebar wallet control. Renders the chain switcher above whichever connect button matches the
 * selected chain.
 *
 * With the BOT Chain flag off this is exactly the old Solana ConnectButton, no switcher, no
 * behavioural change. Ghost Pay is live, so the second chain stays invisible in production until
 * the whole path is verified end to end.
 */
export default function WalletControl() {
  const { isBotChain } = useChain();

  if (!BOTCHAIN_ENABLED) return <ConnectButton />;

  return (
    <>
      <ChainSwitcher />
      {isBotChain ? <EvmConnectButton /> : <ConnectButton />}
    </>
  );
}
