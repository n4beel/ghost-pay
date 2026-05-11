"use client";

import { createContext, useContext, useCallback, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUmbra } from "@/hooks/useUmbra";
import { useToast } from "@/components/ui/Toast";
import { scanAndClaimUtxos } from "@/lib/umbra/receive";
import { logActivity } from "@/lib/activity-log";
import { trackEvent } from "@/lib/torque/events";

interface ClaimContextValue {
  claiming: boolean;
  claimElapsed: number;
  startClaim: () => void;
  lastClaimAt: number | null;
}

const ClaimContext = createContext<ClaimContextValue>({
  claiming: false,
  claimElapsed: 0,
  startClaim: () => {},
  lastClaimAt: null,
});

export function useClaimBackground() {
  return useContext(ClaimContext);
}

export function ClaimProvider({ children }: { children: React.ReactNode }) {
  const { client } = useUmbra();
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const [claiming, setClaiming] = useState(false);
  const [claimElapsed, setClaimElapsed] = useState(0);
  const [lastClaimAt, setLastClaimAt] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevent double-firing if startClaim is called while already running
  const claimingRef = useRef(false);

  const startClaim = useCallback(async () => {
    if (!client || claimingRef.current) return;

    claimingRef.current = true;
    setClaiming(true);
    setClaimElapsed(0);
    timerRef.current = setInterval(() => setClaimElapsed((e) => e + 1), 1000);

    try {
      const { claimed } = await scanAndClaimUtxos(client);
      const wallet = publicKey?.toBase58();

      if (claimed > 0) {
        toast("success", `${claimed} payment${claimed > 1 ? "s" : ""} claimed`, "Balance updating");
        setLastClaimAt(Date.now());
        if (wallet) {
          logActivity(wallet, { type: "claim", token: "mixed", amount: String(claimed), timestamp: Date.now() });
          trackEvent(wallet, "claim_completed", { amount: claimed });
        }
      } else {
        toast("info", "No pending payments");
      }
    } catch (err) {
      toast("error", "Claim failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      claimingRef.current = false;
      setClaiming(false);
    }
  }, [client, publicKey, toast]);

  return (
    <ClaimContext.Provider value={{ claiming, claimElapsed, startClaim, lastClaimAt }}>
      {children}
    </ClaimContext.Provider>
  );
}
