"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  BOTCHAIN_ENABLED,
  CHAIN_STORAGE_KEY,
  DEFAULT_CHAIN,
  canSelectChain,
  resolveActiveChain,
  type ActiveChain,
} from "@/lib/botchain/gate";

export type { ActiveChain };

interface ChainContextValue {
  activeChain: ActiveChain;
  setActiveChain: (chain: ActiveChain) => void;
  isSolana: boolean;
  isBotChain: boolean;
  /** Whether the BOT Chain path exists in this build at all. */
  botChainEnabled: boolean;
  /** False until the persisted choice has been read, so SSR and first paint agree. */
  hydrated: boolean;
}

const ChainContext = createContext<ChainContextValue>({
  activeChain: "solana",
  setActiveChain: () => {},
  isSolana: true,
  isBotChain: false,
  botChainEnabled: false,
  hydrated: false,
});

/**
 * Which chain the UI is currently pointed at.
 *
 * Deliberately not an abstraction over the two wallet stacks. Solana and BOT Chain share almost
 * nothing at this stage, so pages read `activeChain` and branch once at the top rather than going
 * through a lowest-common-denominator wallet interface that would fit neither well.
 *
 * This provider is also the single place the BOT Chain feature flag is enforced. Hiding the chain
 * switcher is not enough on its own: a stored selection would still route every page to a BOT Chain
 * view with no way to get back. `resolveActiveChain` is what actually decides, and it is tested.
 *
 * The initial state is `DEFAULT_CHAIN` rather than a hardcoded `"solana"`. It depends only on the
 * build-time flag, so the server and the first client render agree and there is no hydration
 * mismatch — and, where the flag is on, no visible flip from a Solana shell to a BOT Chain one on
 * every load.
 */
export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [activeChain, setActiveChainState] = useState<ActiveChain>(DEFAULT_CHAIN);
  const [hydrated, setHydrated] = useState(false);

  // Read the persisted choice after mount. Reading during render would desync server and client
  // markup and produce a hydration mismatch.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CHAIN_STORAGE_KEY);
    } catch {
      // Private mode or blocked storage. The default is fine.
    }

    const resolved = resolveActiveChain(stored, BOTCHAIN_ENABLED);
    setActiveChainState(resolved);

    // Clear a selection the flag no longer permits, so it does not spring back if the flag is
    // turned on again for an unrelated reason later.
    if (stored && stored !== resolved) {
      try {
        localStorage.setItem(CHAIN_STORAGE_KEY, resolved);
      } catch {
        // Non-fatal.
      }
    }

    setHydrated(true);
  }, []);

  const setActiveChain = useCallback((chain: ActiveChain) => {
    if (!canSelectChain(chain, BOTCHAIN_ENABLED)) return;
    setActiveChainState(chain);
    try {
      localStorage.setItem(CHAIN_STORAGE_KEY, chain);
    } catch {
      // Non-fatal: the choice just will not survive a reload.
    }
  }, []);

  return (
    <ChainContext.Provider
      value={{
        activeChain,
        setActiveChain,
        isSolana: activeChain === "solana",
        isBotChain: activeChain === "botchain",
        botChainEnabled: BOTCHAIN_ENABLED,
        hydrated,
      }}
    >
      {children}
    </ChainContext.Provider>
  );
}

export function useChain(): ChainContextValue {
  return useContext(ChainContext);
}
