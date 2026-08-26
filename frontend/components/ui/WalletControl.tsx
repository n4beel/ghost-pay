"use client";

import { useChain } from "@/components/providers/ChainProvider";
import ChainSwitcher from "./ChainSwitcher";
import ConnectButton from "./ConnectButton";
import EvmConnectButton from "./EvmConnectButton";

/**
 * The sidebar wallet control. Renders the chain switcher above whichever connect button matches the
 * selected chain.
 *
 * With the BOT Chain flag off this is exactly the old Solana ConnectButton, no switcher, no
 * behavioural change. The flag itself lives in ChainProvider, which also forces `isBotChain` false
 * — hiding the switcher alone would leave a stored selection routing pages to a BOT Chain view
 * this control cannot serve.
 */
export default function WalletControl() {
  const { isBotChain, botChainEnabled } = useChain();

  if (!botChainEnabled) return <ConnectButton />;

  return (
    <>
      <ChainSwitcher />
      {isBotChain ? <EvmConnectButton /> : <ConnectButton />}
    </>
  );
}
