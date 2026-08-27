"use client";

import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { useChain } from "@/components/providers/ChainProvider";

/**
 * Stands in for a Solana-only page while BOT Chain is the active chain.
 *
 * Without it these pages render their Solana connect prompt, which invites someone on BOT Chain to
 * connect a second wallet the app has just gone to some trouble to disconnect. The sidebar already
 * marks them `SOL`; this says the same thing where the user actually lands, and offers the switch
 * rather than a dead end.
 */
export default function SolanaOnlyNotice({ feature }: { feature: string }) {
  const { setActiveChain } = useChain();

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "480px" }}>
      <Panel>
        <p
          className="text-[11px] uppercase tracking-[0.04em] mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Solana only
        </p>
        <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-tertiary)" }}>
          {feature} runs on Solana and has no BOT Chain equivalent yet. Switching back will
          reconnect your Solana wallet and disconnect the BOT Chain one — Ghost Pay keeps exactly
          one chain connected at a time.
        </p>
        <Button size="sm" onClick={() => setActiveChain("solana")}>
          Switch to Solana
        </Button>
      </Panel>
    </div>
  );
}
