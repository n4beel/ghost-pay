"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import WalletControl from "@/components/ui/WalletControl";
import { activeBotChain, faucetUrl, isBotChainId } from "@/lib/botchain/chain";
import { isDeployed } from "@/lib/botchain/contracts";
import BotChainBanner from "./BotChainBanner";

/**
 * The preconditions every BOT Chain screen shares, in one place.
 *
 * Each of these is a state a user can genuinely land in, and each has a different answer. Rendering
 * a send form to someone on the wrong network, or one pointed at contract addresses that are all
 * zero, produces a failure the user cannot diagnose — so nothing renders until the path is real.
 */
export default function BotChainGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    // The connect control renders here rather than a pointer at the sidebar. On a phone the rail is
    // behind a hamburger, so "connect from the sidebar" asked the user to guess where the wallet
    // lived before they could do the one thing the screen wanted. This is also the chain switcher,
    // which is the way back to Solana for someone who landed on BOT Chain by default.
    return (
      <Notice title="Wallet not connected">
        <p className="mb-4">Connect an EVM wallet to use {activeBotChain.name}.</p>
        <div style={{ maxWidth: "220px" }}>
          <WalletControl />
        </div>
      </Notice>
    );
  }

  if (!isBotChainId(chainId)) {
    return (
      <Notice title={`Wrong network`}>
        <p className="mb-4">
          Your wallet is on another network. Switch to {activeBotChain.name} to continue.
        </p>
        <Button
          size="sm"
          variant="ghost"
          loading={isPending}
          onClick={() => switchChain({ chainId: activeBotChain.id })}
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          Switch to {activeBotChain.name}
        </Button>
      </Notice>
    );
  }

  if (!isDeployed(chainId)) {
    const faucet = faucetUrl(chainId);
    return (
      <Notice title="Contracts not deployed">
        <p className="mb-3">
          The stealth contracts have no addresses configured for {activeBotChain.name}. Deploy them
          with <code style={{ color: "var(--text-secondary)" }}>contracts/script/Deploy.s.sol</code>,
          then set the <code style={{ color: "var(--text-secondary)" }}>NEXT_PUBLIC_ANNOUNCER_*</code>,
          {" "}<code style={{ color: "var(--text-secondary)" }}>REGISTRY</code>,{" "}
          <code style={{ color: "var(--text-secondary)" }}>STEALTH_SEND</code> and{" "}
          <code style={{ color: "var(--text-secondary)" }}>DEPLOY_BLOCK</code> variables the script
          prints.
        </p>
        {faucet && (
          <p style={{ color: "var(--text-tertiary)" }}>
            Test funds:{" "}
            <a href={faucet} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
              {faucet}
            </a>
          </p>
        )}
      </Notice>
    );
  }

  // The banner rides with the gate so every BOT Chain screen carries the network and the honest
  // scope of what stealth addresses hide, without each page remembering to include it.
  return (
    <>
      <BotChainBanner />
      {children}
    </>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: "480px" }}>
      <Panel>
        <p
          className="text-[11px] uppercase tracking-[0.04em] mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </p>
        <div className="text-[12px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          {children}
        </div>
      </Panel>
    </div>
  );
}
