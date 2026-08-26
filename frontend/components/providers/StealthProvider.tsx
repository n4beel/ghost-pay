"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import {
  STEALTH_KEY_MESSAGE,
  assertDeterministicDerivation,
  encodeMetaAddress,
  metaAddressFingerprint,
  toViewingKeys,
  type StealthKeys,
  type StealthMetaAddress,
  type ViewingKeys,
} from "@/lib/stealth";

/**
 * Holds the connected account's stealth keys for the session.
 *
 * The keys live in memory and nowhere else. They are re-derivable from a wallet signature at any
 * time, so persisting them would add a theft surface for no benefit — the recovery story is "sign
 * the message again", not "read it back from disk".
 *
 * What *is* persisted is the meta-address, which is public and gets published to the ERC-6538
 * registry anyway. It is kept for one reason: to catch a wallet whose signing is not deterministic.
 */

export type StealthStatus = "locked" | "unlocking" | "unlocked" | "error";

interface StealthContextValue {
  status: StealthStatus;
  keys: StealthKeys | null;
  viewingKeys: ViewingKeys | null;
  metaAddress: StealthMetaAddress | null;
  /** Short label for the current identity. Changes between sessions mean nondeterministic signing. */
  fingerprint: string | null;
  error: string | null;
  /** Sign and derive. Prompts the wallet twice — see the determinism check below. */
  unlock: () => Promise<void>;
  /** Forget the keys for this session. */
  lock: () => void;
}

const StealthContext = createContext<StealthContextValue>({
  status: "locked",
  keys: null,
  viewingKeys: null,
  metaAddress: null,
  fingerprint: null,
  error: null,
  unlock: async () => {},
  lock: () => {},
});

/** Namespaced per account, so switching wallets never compares one identity against another's. */
function storageKey(address: string): string {
  return `ghost-pay:stealth-meta:${address.toLowerCase()}`;
}

export function StealthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [status, setStatus] = useState<StealthStatus>("locked");
  const [keys, setKeys] = useState<StealthKeys | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Whose keys these are. Guards against an account switch landing mid-signature and leaving one
  // account holding another's keys.
  const ownerRef = useRef<string | null>(null);

  const lock = useCallback(() => {
    setKeys(null);
    setStatus("locked");
    setError(null);
    ownerRef.current = null;
  }, []);

  // Disconnecting or switching accounts invalidates the keys immediately. Anything else would leave
  // the previous account's spending key reachable from the new account's UI.
  useEffect(() => {
    if (!isConnected || !address) {
      lock();
      return;
    }
    if (ownerRef.current && ownerRef.current !== address.toLowerCase()) {
      lock();
    }
  }, [address, isConnected, lock]);

  const unlock = useCallback(async () => {
    if (!address) return;
    const owner = address.toLowerCase();

    setStatus("unlocking");
    setError(null);

    try {
      // Two signatures of the same message, compared before either is trusted.
      //
      // Signature-derived keys assume the wallet signs deterministically. RFC-6979 signers do; MPC
      // and threshold signers are not obliged to, and BOT Chain's own Bo Wallet offers MPC
      // accounts. A wallet that randomises this gives the user a different identity every session
      // and strands everything paid to the previous one.
      const first = await signMessageAsync({ message: STEALTH_KEY_MESSAGE });
      const second = await signMessageAsync({ message: STEALTH_KEY_MESSAGE });

      // Throws with a user-readable explanation when the two disagree.
      const derived = assertDeterministicDerivation(first, second);
      const metaAddress = encodeMetaAddress(derived);

      // Signing twice in one session only catches a signer that randomises per call. One that is
      // stable within a session but drifts across sessions would pass that check and still lose the
      // user their funds, so the meta-address from last time is compared too.
      const previous = readStoredMetaAddress(owner);
      if (previous && previous !== metaAddress) {
        throw new Error(
          "This wallet derived a different stealth identity than it did last time, so payments " +
            "sent to the previous one would be unreachable. Ghost Pay cannot use stealth addresses " +
            "with this wallet.",
        );
      }
      if (!previous) writeStoredMetaAddress(owner, metaAddress);

      // The account may have changed while the wallet was prompting.
      if (address.toLowerCase() !== owner) return;

      ownerRef.current = owner;
      setKeys(derived);
      setStatus("unlocked");
    } catch (err) {
      setKeys(null);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not derive stealth keys");
    }
  }, [address, signMessageAsync]);

  const value = useMemo<StealthContextValue>(() => {
    const metaAddress = keys ? encodeMetaAddress(keys) : null;
    return {
      status,
      keys,
      viewingKeys: keys ? toViewingKeys(keys) : null,
      metaAddress,
      fingerprint: metaAddress ? metaAddressFingerprint(metaAddress) : null,
      error,
      unlock,
      lock,
    };
  }, [status, keys, error, unlock, lock]);

  return <StealthContext.Provider value={value}>{children}</StealthContext.Provider>;
}

export function useStealth(): StealthContextValue {
  return useContext(StealthContext);
}

function readStoredMetaAddress(owner: string): StealthMetaAddress | null {
  try {
    return (localStorage.getItem(storageKey(owner)) as StealthMetaAddress) || null;
  } catch {
    // Private mode or blocked storage. The cross-session check is a safety net, not a requirement;
    // losing it degrades the guard rather than blocking the user.
    return null;
  }
}

function writeStoredMetaAddress(owner: string, metaAddress: StealthMetaAddress): void {
  try {
    localStorage.setItem(storageKey(owner), metaAddress);
  } catch {
    // As above.
  }
}
