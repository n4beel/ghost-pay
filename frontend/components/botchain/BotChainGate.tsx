"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { activeBotChain, faucetUrl, isBotChainId } from "@/lib/botchain/chain";
import { isDeployed } from "@/lib/botchain/contracts";

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
    return (
      <Notice title="Wallet not connected">
        Connect an EVM wallet from the sidebar to use {activeBotChain.name}.
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

  return <>{children}</>;
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
