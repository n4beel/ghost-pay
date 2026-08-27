"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useChain } from "./ChainProvider";
import { initUmbraClient } from "@/lib/umbra/client";
import { createUmbraSignerFromAdapter } from "@/lib/umbra/signer";
import type { UmbraClient } from "@/lib/umbra/client";
import {
  registerUser,
  isUserRegistered,
  getCachedRegistration,
  setCachedRegistration,
} from "@/lib/umbra/registration";

type RegistrationState =
  | "unknown"
  | "checking"
  | "unregistered"
  | "registering"
  | "registered"
  | "error";

interface UmbraContextValue {
  client: UmbraClient | null;
  registrationState: RegistrationState;
  register: () => Promise<void>;
  isReady: boolean;
}

const UmbraContext = createContext<UmbraContextValue>({
  client: null,
  registrationState: "unknown",
  register: async () => {},
  isReady: false,
});

export function UmbraProvider({ children }: { children: React.ReactNode }) {
  const { wallet, connected, publicKey } = useWallet();
  const { isBotChain } = useChain();
  const [client, setClient] = useState<UmbraClient | null>(null);
  const [registrationState, setRegistrationState] = useState<RegistrationState>("unknown");

  const initializedForKey = useRef<string | null>(null);

  useEffect(() => {
    // Umbra is Solana-only. Initialising it while the user is on BOT Chain would prompt for
    // signatures, read registration state on a chain they have switched away from, and keep a live
    // Solana session behind a BOT Chain screen. Treated exactly like a disconnected wallet, so the
    // client is torn down rather than merely ignored.
    if (isBotChain || !connected || !wallet || !publicKey) {
      setClient(null);
      setRegistrationState("unknown");
      initializedForKey.current = null;
      return;
    }

    const currentKey = publicKey.toBase58();
    if (initializedForKey.current === currentKey && client !== null) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = wallet.adapter as any;
    if (!adapter || typeof adapter.signTransaction !== "function") return;

    let cancelled = false;

    async function init() {
      const signer = createUmbraSignerFromAdapter(adapter, publicKey?.toBase58());
      const c = await initUmbraClient(signer);
      if (cancelled) return;

      initializedForKey.current = currentKey;
      setClient(c);

      const cached = getCachedRegistration(currentKey);
      // Show unregistered from cache immediately so the Register button appears fast.
      // Always re-verify on-chain — the old check was broken (null check on a never-null result),
      // so cached "registered" values may be stale.
      if (cached === false) {
        setRegistrationState("unregistered");
        return;
      }

      setRegistrationState("checking");
      const registered = await isUserRegistered(c);
      if (cancelled) return;
      setCachedRegistration(currentKey, registered);
      setRegistrationState(registered ? "registered" : "unregistered");
    }

    init().catch((err) => {
      console.error("[UmbraProvider] init error:", err);
      if (!cancelled) setRegistrationState("error");
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotChain, connected, wallet, publicKey]);

  const register = useCallback(async () => {
    if (!client || registrationState === "registering") return;
    setRegistrationState("registering");
    try {
      await registerUser(client);
      if (publicKey) setCachedRegistration(publicKey.toBase58(), true);
      setRegistrationState("registered");
    } catch {
      setRegistrationState("error");
    }
  }, [client, registrationState, publicKey]);

  return (
    <UmbraContext.Provider
      value={{
        client,
        registrationState,
        register,
        isReady: registrationState === "registered" && client !== null,
      }}
    >
      {children}
    </UmbraContext.Provider>
  );
}

export function useUmbraContext(): UmbraContextValue {
  return useContext(UmbraContext);
}
