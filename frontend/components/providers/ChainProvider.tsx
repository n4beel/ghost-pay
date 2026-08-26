"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ActiveChain = "solana" | "botchain";

interface ChainContextValue {
  activeChain: ActiveChain;
  setActiveChain: (chain: ActiveChain) => void;
  isSolana: boolean;
  isBotChain: boolean;
  /** False until the persisted choice has been read, so SSR and first paint agree. */
  hydrated: boolean;
}

const STORAGE_KEY = "ghost-pay:active-chain";

const ChainContext = createContext<ChainContextValue>({
  activeChain: "solana",
  setActiveChain: () => {},
  isSolana: true,
  isBotChain: false,
  hydrated: false,
});

/**
 * Which chain the UI is currently pointed at.
 *
 * Deliberately not an abstraction over the two wallet stacks. Solana and BOT Chain share almost
 * nothing at this stage, so pages read `activeChain` and branch once at the top rather than going
 * through a lowest-common-denominator wallet interface that would fit neither well.
 *
 * Defaults to Solana. Ghost Pay is a Solana product that also speaks BOT Chain, not the reverse.
 */
export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [activeChain, setActiveChainState] = useState<ActiveChain>("solana");
  const [hydrated, setHydrated] = useState(false);

  // Read the persisted choice after mount. Reading during render would desync server and client
  // markup and produce a hydration mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "botchain" || stored === "solana") {
        setActiveChainState(stored);
      }
    } catch {
      // Private mode or blocked storage. The Solana default is fine.
    }
    setHydrated(true);
  }, []);

  const setActiveChain = useCallback((chain: ActiveChain) => {
    setActiveChainState(chain);
    try {
      localStorage.setItem(STORAGE_KEY, chain);
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
