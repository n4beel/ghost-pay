import { concatHex, keccak256, stringToHex, type Hex } from "viem";
import {
  COMPRESSED_PUBLIC_KEY_BYTES,
  CURVE_ORDER,
  StealthError,
  decodePublicKey,
  encodePrivateKey,
  publicKeyOf,
  requireBytes,
} from "./crypto";

/**
 * Stealth key material, derived from one wallet signature.
 *
 * Two independent keypairs. The **viewing** key finds payments: it decrypts nothing on its own, it
 * only lets its holder recognise which announcements are theirs, so it can be handed to a watch-only
 * service without giving up funds. The **spending** key moves them. Keeping them separate is what
 * makes an auditor or a balance widget possible without handing over spend authority.
 */
export type StealthKeys = {
  spendingPrivateKey: Hex;
  spendingPublicKey: Hex;
  viewingPrivateKey: Hex;
  viewingPublicKey: Hex;
};

/** The half of {@link StealthKeys} needed to scan, but not to spend. */
export type ViewingKeys = Pick<StealthKeys, "spendingPublicKey" | "viewingPrivateKey">;

/**
 * The message the user signs to derive their stealth keys.
 *
 * This string is permanent. Changing so much as a character gives every existing user a different
 * keypair and orphans every payment already sent to them, with no error and no way back. The
 * version suffix exists so that if the derivation ever genuinely has to change, it changes
 * deliberately and visibly rather than by an accidental edit to this line.
 */
export const STEALTH_KEY_MESSAGE =
  "Ghost Pay stealth keys v1\n\n" +
  "Sign this message to derive the keys that let you receive private payments on BOT Chain.\n\n" +
  "This signature never leaves your device and grants no permissions. Only sign it on Ghost Pay.";

/** Domain separators, so the two keys cannot collide even if the seed is reused. */
const SPEND_LABEL = "spend";
const VIEW_LABEL = "view";

/** An EVM signature is r ‖ s ‖ v — 65 bytes. */
const SIGNATURE_BYTES = 65;

/**
 * Derive both keypairs deterministically from a wallet signature.
 *
 * `seed = keccak256(signature)`, then `p_spend = keccak256(seed ‖ "spend")` and
 * `p_view = keccak256(seed ‖ "view")`, each reduced into `[1, n-1]`. Nothing is stored: the user
 * recovers the same keys on any device by signing the same message with the same wallet.
 *
 * **That recovery property depends entirely on the wallet signing deterministically.** RFC-6979
 * signers do — MetaMask included, which is what this path uses. MPC and threshold signers are not
 * required to, so the guard stays for whatever connects next. A
 * wallet that returns different bytes for the same message gives the user different stealth keys
 * every session, and every payment sent to a previous session's meta-address becomes unspendable.
 * Call {@link assertDeterministicDerivation} before treating derived keys as recoverable, and see
 * `DOCUMENTATION/BOTCHAIN.md` for the fallback if it turns out not to hold.
 */
export function deriveStealthKeys(signature: Hex): StealthKeys {
  requireBytes(signature, SIGNATURE_BYTES, "signature");

  const seed = keccak256(signature);
  const spendingPrivateKey = deriveScalar(seed, SPEND_LABEL);
  const viewingPrivateKey = deriveScalar(seed, VIEW_LABEL);

  if (spendingPrivateKey === viewingPrivateKey) {
    // Unreachable short of a keccak collision, but a silent collapse to one key would halve the
    // scheme's privacy without any visible symptom.
    throw new StealthError("spending and viewing keys collided");
  }

  return {
    spendingPrivateKey,
    spendingPublicKey: publicKeyOf(spendingPrivateKey),
    viewingPrivateKey,
    viewingPublicKey: publicKeyOf(viewingPrivateKey),
  };
}

function deriveScalar(seed: Hex, label: string): Hex {
  const hash = keccak256(concatHex([seed, stringToHex(label)]));
  const reduced = BigInt(hash) % CURVE_ORDER;
  if (reduced === 0n) {
    // Probability ~2^-256. Throwing is correct: silently substituting anything would make the key
    // unrecoverable on the next derivation.
    throw new StealthError(`derived ${label} key is zero`);
  }
  return encodePrivateKey(reduced);
}


/**
 * Verify a wallet signs deterministically, by deriving twice from two signatures of the same
 * message and comparing the results.
 *
 * The caller signs {@link STEALTH_KEY_MESSAGE} twice and passes both signatures. If they disagree,
 * signature-derived keys are unsafe with this wallet and the caller must not let the user receive
 * funds against them. Throws rather than returning false, because every caller of this is a guard
 * and an ignored boolean here costs someone their money.
 */
export function assertDeterministicDerivation(signatureA: Hex, signatureB: Hex): StealthKeys {
  const a = deriveStealthKeys(signatureA);
  const b = deriveStealthKeys(signatureB);
  if (a.spendingPrivateKey !== b.spendingPrivateKey || a.viewingPrivateKey !== b.viewingPrivateKey) {
    throw new StealthError(
      "This wallet produced two different signatures for the same message, so stealth keys derived " +
        "from it would change between sessions and funds sent to them would be lost. Ghost Pay " +
        "cannot use stealth addresses with this wallet.",
    );
  }
  return a;
}

/**
 * A stealth meta-address: the spending and viewing public keys concatenated, 66 bytes.
 *
 * This is what gets published to the ERC-6538 registry and what a sender needs. It is public.
 */
export type StealthMetaAddress = Hex;

export const META_ADDRESS_BYTES = COMPRESSED_PUBLIC_KEY_BYTES * 2;

/** `0x<spendingPubKey><viewingPubKey>`. */
export function encodeMetaAddress(keys: Pick<StealthKeys, "spendingPublicKey" | "viewingPublicKey">): StealthMetaAddress {
  decodePublicKey(keys.spendingPublicKey, "spending public key");
  decodePublicKey(keys.viewingPublicKey, "viewing public key");
  return concatHex([keys.spendingPublicKey, keys.viewingPublicKey]);
}

/**
 * Split a meta-address back into its two public keys, validating both are on the curve.
 *
 * A meta-address arrives from a registry read or from something a user pasted. An invalid point
 * that reaches the sender path produces a stealth address nobody holds the key to, so this rejects
 * rather than coerces.
 */
export function decodeMetaAddress(metaAddress: StealthMetaAddress): {
  spendingPublicKey: Hex;
  viewingPublicKey: Hex;
} {
  requireBytes(metaAddress, META_ADDRESS_BYTES, "stealth meta-address");
  const split = 2 + COMPRESSED_PUBLIC_KEY_BYTES * 2;
  const spendingPublicKey = `0x${metaAddress.slice(2, split)}` as Hex;
  const viewingPublicKey = `0x${metaAddress.slice(split)}` as Hex;

  decodePublicKey(spendingPublicKey, "spending public key");
  decodePublicKey(viewingPublicKey, "viewing public key");

  return { spendingPublicKey, viewingPublicKey };
}

/** True when `value` parses as a meta-address. For validating input as the user types. */
export function isValidMetaAddress(value: string): value is StealthMetaAddress {
  try {
    decodeMetaAddress(value as Hex);
    return true;
  } catch {
    return false;
  }
}

/**
 * The human-facing URI form from ERC-5564: `st:<chain>:0x<spend><view>`.
 *
 * The prefix exists only to distinguish a meta-address from a normal address at a glance; it is
 * stripped before any computation. ERC-5564 spells the Ethereum case `st:eth:`, so BOT Chain gets
 * its own short name rather than borrowing one.
 */
export const META_ADDRESS_CHAIN_LABEL = "bot";

export function toMetaAddressUri(
  metaAddress: StealthMetaAddress,
  chainLabel: string = META_ADDRESS_CHAIN_LABEL,
): string {
  decodeMetaAddress(metaAddress);
  return `st:${chainLabel}:${metaAddress}`;
}

/**
 * Accept either a bare meta-address or the `st:<chain>:` URI form.
 *
 * Any chain label is accepted. The keys are chain-independent, and rejecting a pasted `st:eth:`
 * address would only teach users to hand-edit the prefix.
 */
export function parseMetaAddressUri(value: string): StealthMetaAddress {
  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    requireBytes(trimmed as Hex, META_ADDRESS_BYTES, "stealth meta-address");
    return trimmed as Hex;
  }

  const parts = trimmed.split(":");
  if (parts.length !== 3 || parts[0] !== "st") {
    throw new StealthError(
      "Expected a stealth meta-address, either 0x… or st:<chain>:0x…",
    );
  }
  requireBytes(parts[2] as Hex, META_ADDRESS_BYTES, "stealth meta-address");
  return parts[2] as Hex;
}

/**
 * Short label for a meta-address, for showing the user which identity they are on.
 *
 * Useful as a nondeterminism tripwire in the UI: if this changes between sessions for the same
 * wallet, the wallet is not signing deterministically.
 */
export function metaAddressFingerprint(metaAddress: StealthMetaAddress): string {
  decodeMetaAddress(metaAddress);
  return `${metaAddress.slice(2, 8)}…${metaAddress.slice(-6)}`;
}

/** Drop the spending private key, leaving only what a scanner needs. */
export function toViewingKeys(keys: StealthKeys): ViewingKeys {
  return {
    spendingPublicKey: keys.spendingPublicKey,
    viewingPrivateKey: keys.viewingPrivateKey,
  };
}
