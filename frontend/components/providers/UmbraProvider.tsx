"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createSignerFromWalletAccount } from "@umbra-privacy/sdk";
import type { StandardWalletAdapter } from "@solana/wallet-adapter-base";
import { initUmbraClient } from "@/lib/umbra/client";
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

function isStandardAdapter(adapter: unknown): adapter is StandardWalletAdapter {
  return !!(adapter as StandardWalletAdapter)?.standard;
}

export function UmbraProvider({ children }: { children: React.ReactNode }) {
  const { wallet, connected, publicKey } = useWallet();
  const [client, setClient] = useState<UmbraClient | null>(null);
  const [registrationState, setRegistrationState] = useState<RegistrationState>("unknown");

  // Track which public key the client was initialized for so we don't re-init on re-renders
  const initializedForKey = useRef<string | null>(null);

  useEffect(() => {
    if (!connected || !wallet || !publicKey) {
      setClient(null);
      setRegistrationState("unknown");
      initializedForKey.current = null;
      return;
    }

    const currentKey = publicKey.toBase58();

    // Already initialized for this wallet — don't re-sign
    if (initializedForKey.current === currentKey && client !== null) return;

    const adapter = wallet.adapter;
    if (!isStandardAdapter(adapter)) {
      setRegistrationState("error");
      return;
    }

    const stdWallet = adapter.wallet;
    const account = stdWallet.accounts[0];
    if (!account) {
      setRegistrationState("error");
      return;
    }

    let cancelled = false;

    async function init() {
      const signer = createSignerFromWalletAccount(stdWallet, account);
      const c = await initUmbraClient(signer);
      if (cancelled) return;

      initializedForKey.current = currentKey;
      setClient(c);

      const cached = getCachedRegistration(currentKey);
      if (cached !== null) {
        setRegistrationState(cached ? "registered" : "unregistered");
        return;
      }

      setRegistrationState("checking");
      const registered = await isUserRegistered(c);
      if (cancelled) return;
      setCachedRegistration(currentKey, registered);
      setRegistrationState(registered ? "registered" : "unregistered");
    }

    init().catch(() => {
      if (!cancelled) setRegistrationState("error");
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, wallet, publicKey]);

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
