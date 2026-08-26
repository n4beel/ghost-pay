import { bytesToHex, concatHex, pad, toHex, type Address, type Hex } from "viem";
import {
  StealthError,
  decodePrivateKey,
  decodePublicKey,
  hashSharedSecret,
  randomPrivateKey,
  sharedSecret,
  stealthPublicKey,
  toAddress,
  viewTagOf,
  Point,
} from "./crypto";
import { decodeMetaAddress, type StealthMetaAddress } from "./keys";

/**
 * Sender side of ERC-5564 scheme 1.
 *
 * The sender never learns the recipient's identity beyond their published meta-address, and the
 * chain never records a link between the two. What it does record is the sender's own address as
 * the origin, and the amount. Recipients are unlinkable; senders and amounts are not. Do not let
 * product copy say otherwise.
 */

export type StealthPayment = {
  /** The one-time address to send to. */
  stealthAddress: Address;
  /** 33 byte compressed ephemeral public key `R`, announced so the recipient can find this. */
  ephemeralPublicKey: Hex;
  /** One byte, the most significant byte of the hashed shared secret. */
  viewTag: Hex;
  /** ERC-5564 metadata: view tag first, then the native-token descriptor. */
  metadata: Hex;
};

/**
 * ERC-5564's native-token metadata layout: view tag, then `0xeeeeeeee`, then the conventional
 * "native token" pseudo-address, then a 32 byte amount. 57 bytes total.
 *
 * The view tag is the only part the protocol requires. The rest lets an indexer show the amount
 * without tracing the transaction, which is what makes a payment history view cheap.
 */
const NATIVE_TOKEN_IDENTIFIER = "0xeeeeeeee" as const;
const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export const METADATA_BYTES = 57;

/**
 * Character offsets into the `0x`-prefixed metadata string.
 *
 * Named rather than inlined because the reference implementation indexes the *unprefixed* string,
 * so borrowing its numbers directly shifts every field two characters and silently returns the tail
 * of the token address as the amount.
 */
const HEX = {
  viewTag: [2, 4],
  identifier: [4, 12],
  token: [12, 52],
  amount: [52, 116],
} as const;

/** Build the 57 byte native-token metadata blob. */
export function buildNativeMetadata(viewTag: Hex, amount: bigint): Hex {
  if (!/^0x[0-9a-fA-F]{2}$/.test(viewTag)) {
    throw new StealthError("view tag must be exactly one byte");
  }
  if (amount < 0n || amount > (1n << 256n) - 1n) {
    throw new StealthError("amount must fit in a uint256");
  }
  return concatHex([
    viewTag,
    NATIVE_TOKEN_IDENTIFIER,
    NATIVE_TOKEN_ADDRESS,
    pad(toHex(amount), { size: 32 }),
  ]);
}

/** Read the amount back out of native-token metadata, or null if it is not that shape. */
export function amountFromMetadata(metadata: Hex): bigint | null {
  if (!/^0x[0-9a-fA-F]{114}$/.test(metadata)) return null;
  if (`0x${metadata.slice(...HEX.identifier)}`.toLowerCase() !== NATIVE_TOKEN_IDENTIFIER) {
    return null;
  }
  return BigInt(`0x${metadata.slice(...HEX.amount)}`);
}

/** The view tag is always the first byte of the metadata, whatever the rest of it is. */
export function viewTagFromMetadata(metadata: Hex): Hex {
  if (!/^0x[0-9a-fA-F]{2,}$/.test(metadata)) {
    throw new StealthError("metadata must contain at least the view tag byte");
  }
  return `0x${metadata.slice(...HEX.viewTag)}`;
}

export type GenerateStealthAddressParams = {
  /** The recipient's published meta-address. */
  metaAddress: StealthMetaAddress;
  /** Amount in wei, recorded in the metadata so it can be indexed without tracing. */
  amount: bigint;
  /**
   * Override the ephemeral private key. Tests only.
   *
   * In production this must be fresh CSPRNG output every single send. Reusing an ephemeral key
   * across two payments to the same recipient produces the same stealth address twice, which links
   * them to each other and destroys the property the whole scheme exists for.
   */
  ephemeralPrivateKey?: Hex;
};

/**
 * Derive a one-time stealth address for a recipient.
 *
 * `s = r · P_view`, `s_h = keccak256(s)`, view tag is `s_h[0]`, and
 * `P_stealth = P_spend + s_h · G`. The recipient recovers the same `s` from `p_view · R`.
 */
export function generateStealthAddress({
  metaAddress,
  amount,
  ephemeralPrivateKey,
}: GenerateStealthAddressParams): StealthPayment {
  const { spendingPublicKey, viewingPublicKey } = decodeMetaAddress(metaAddress);

  const ephemeral = ephemeralPrivateKey ?? randomPrivateKey();
  const ephemeralScalar = decodePrivateKey(ephemeral, "ephemeral private key");

  const viewingPoint = decodePublicKey(viewingPublicKey, "viewing public key");
  const spendingPoint = decodePublicKey(spendingPublicKey, "spending public key");

  const hashed = hashSharedSecret(sharedSecret(ephemeralScalar, viewingPoint));
  const viewTag = viewTagOf(hashed);
  const stealthAddress = toAddress(stealthPublicKey(spendingPoint, hashed));

  return {
    stealthAddress,
    ephemeralPublicKey: bytesToHex(Point.BASE.multiply(ephemeralScalar).toBytes(true)),
    viewTag,
    metadata: buildNativeMetadata(viewTag, amount),
  };
}
