"use client";

import { useChainId } from "wagmi";
import { botChainById, faucetUrl, isBotChainId, botChain } from "@/lib/botchain/chain";

/**
 * What the BOT Chain path is, stated at the top of every screen that uses it.
 *
 * Two things a user has to know before they move money here, and neither should be buried:
 *
 *  1. **Which network.** Bohr is a testnet. tBOT is worthless. Someone who thinks they are on
 *     mainnet and is not will conclude the product is broken when a real payment never arrives.
 *  2. **What this actually hides.** Stealth addresses make the *recipient* unlinkable. The amount
 *     and the sender's address stay in plain sight. That is a real subset of what Ghost Pay does on
 *     Solana, and a listing review is exactly the audience that will check the claim against the
 *     chain. Overstating it here is worse than saying nothing.
 */
export default function BotChainBanner() {
  const chainId = useChainId();
  if (!isBotChainId(chainId)) return null;

  const chain = botChainById(chainId);
  const isMainnet = chainId === botChain.id;
  const faucet = faucetUrl(chainId);
  const accent = isMainnet ? "var(--border-default)" : "var(--warning)";

  return (
    <div
      className="mx-auto w-full mb-4 px-4 py-3"
      style={{
        maxWidth: "560px",
        border: `1px solid ${accent}`,
        borderLeftWidth: "2px",
        background: "var(--bg-surface)",
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.04em]"
          style={{ color: isMainnet ? "var(--text-secondary)" : "var(--warning)" }}
        >
          {chain.name}
        </span>
        {!isMainnet && (
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Test network — {chain.nativeCurrency.symbol} has no value
          </span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: "var(--text-tertiary)" }}>
        Payments here use ERC-5564 stealth addresses. Each one goes to a fresh address that only the
        recipient can spend from, so nothing on chain links them to it.{" "}
        <span style={{ color: "var(--text-secondary)" }}>
          Amounts and your own address stay public
        </span>
        {" "}— this is narrower than the Solana side, which also hides amounts.
      </p>

      {faucet && (
        <a
          href={faucet}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[11px] mt-1.5"
          style={{ color: "var(--accent)" }}
        >
          Get test {chain.nativeCurrency.symbol}
        </a>
      )}
    </div>
  );
}
