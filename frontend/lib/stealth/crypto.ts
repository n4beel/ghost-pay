import { secp256k1 } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes, keccak256, type Address, type Hex } from "viem";
import { publicKeyToAddress } from "viem/utils";

/**
 * ERC-5564 scheme 1 primitives over secp256k1.
 *
 * Every byte-level convention in this file is load-bearing for interoperability. Scheme 1 says
 * "the secret is hashed", not which encoding of the point gets hashed, and picking the wrong one
 * produces a stealth address that is internally consistent and completely unreachable by any other
 * ERC-5564 implementation. The convention the ecosystem actually settled on — ScopeLift's
 * `stealth-address-sdk`, which is what wallets and indexers built against — is:
 *
 *   keccak256 over the 33 byte COMPRESSED SEC1 encoding of the shared secret point.
 *
 * `__tests__/reference.test.ts` pins this against that SDK directly rather than trusting the
 * comment. If you change anything here, that test is the one that will tell you.
 */

/** secp256k1 point constructor. */
export const Point = secp256k1.Point;

/** Order of the secp256k1 prime-order subgroup, `n`. Scalars live in `[1, n-1]`. */
export const CURVE_ORDER: bigint = Point.Fn.ORDER;

/** Scheme ID 1 is secp256k1 with view tags, per ERC-5564. */
export const SCHEME_ID = 1n;

/** A compressed SEC1 point: 33 bytes, `0x02` or `0x03` prefix. */
export const COMPRESSED_PUBLIC_KEY_BYTES = 33;

/** A secp256k1 scalar: 32 bytes. */
export const PRIVATE_KEY_BYTES = 32;

export class StealthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StealthError";
  }
}

/** Parse a `0x`-prefixed hex string of an exact byte length, or throw with a useful message. */
export function requireBytes(value: Hex, length: number, label: string): Uint8Array {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new StealthError(`${label} must be a 0x-prefixed hex string`);
  }
  if (!/^0x[0-9a-fA-F]*$/.test(value)) {
    throw new StealthError(`${label} contains non-hex characters`);
  }
  if (value.length !== 2 + length * 2) {
    throw new StealthError(
      `${label} must be ${length} bytes, got ${(value.length - 2) / 2}`,
    );
  }
  return hexToBytes(value);
}

/**
 * Decode a compressed public key into a curve point, rejecting anything not on the curve.
 *
 * `Point.fromBytes` already validates, but its errors name byte offsets rather than which key was
 * malformed, and this is exactly the path a pasted meta-address takes.
 */
export function decodePublicKey(publicKey: Hex, label: string) {
  const bytes = requireBytes(publicKey, COMPRESSED_PUBLIC_KEY_BYTES, label);
  if (bytes[0] !== 0x02 && bytes[0] !== 0x03) {
    throw new StealthError(
      `${label} must be a compressed SEC1 key starting with 0x02 or 0x03`,
    );
  }
  try {
    return Point.fromBytes(bytes);
  } catch (cause) {
    throw new StealthError(
      `${label} is not a valid secp256k1 point: ${(cause as Error).message}`,
    );
  }
}

/** Decode a 32 byte private key, rejecting zero and anything at or above the curve order. */
export function decodePrivateKey(privateKey: Hex, label: string): bigint {
  requireBytes(privateKey, PRIVATE_KEY_BYTES, label);
  const scalar = BigInt(privateKey);
  if (scalar === 0n || scalar >= CURVE_ORDER) {
    throw new StealthError(`${label} is not in the valid scalar range [1, n-1]`);
  }
  return scalar;
}

/** Encode a scalar as a 32 byte hex private key. */
export function encodePrivateKey(scalar: bigint): Hex {
  if (scalar <= 0n || scalar >= CURVE_ORDER) {
    throw new StealthError("scalar is not in the valid range [1, n-1]");
  }
  return `0x${scalar.toString(16).padStart(PRIVATE_KEY_BYTES * 2, "0")}`;
}

/** Compressed public key for a private key. */
export function publicKeyOf(privateKey: Hex): Hex {
  const scalar = decodePrivateKey(privateKey, "private key");
  return bytesToHex(Point.BASE.multiply(scalar).toBytes(true));
}

/**
 * ECDH: multiply a point by a scalar and return the 33 byte compressed result.
 *
 * This is the shared secret `s` of the spec. Both sides reach the same point — the sender computes
 * `r · P_view`, the recipient `p_view · R` — because both equal `r · p_view · G`.
 */
export function sharedSecret(scalar: bigint, point: ReturnType<typeof Point.fromBytes>): Uint8Array {
  return point.multiply(scalar).toBytes(true);
}

/** `s_h = keccak256(s)`, over the compressed encoding. See the file header. */
export function hashSharedSecret(secret: Uint8Array): Hex {
  return keccak256(secret);
}

/**
 * The view tag is the most significant byte of the hashed shared secret.
 *
 * One byte discards 255 of every 256 announcements that are not ours before any curve
 * multiplication, which is the whole reason scanning is cheap enough to do in a browser.
 */
export function viewTagOf(hashedSharedSecret: Hex): Hex {
  return `0x${hashedSharedSecret.slice(2, 4)}`;
}

/**
 * `P_stealth = P_spend + s_h · G`, returned as an uncompressed SEC1 key.
 *
 * `s_h` is used as a scalar here. It is a keccak output, so it is a uniform 256 bit value that can
 * in principle land outside `[1, n-1]`; `Point.BASE.multiply` rejects those rather than silently
 * reducing, which is the behaviour we want — a rejected send is recoverable, a mismatched
 * derivation is not. The odds are around 2^-128, so this is a correctness guard, not a code path.
 */
export function stealthPublicKey(
  spendingPublicKey: ReturnType<typeof Point.fromBytes>,
  hashedSharedSecret: Hex,
): Hex {
  const scalar = BigInt(hashedSharedSecret);
  if (scalar === 0n || scalar >= CURVE_ORDER) {
    throw new StealthError(
      "hashed shared secret is outside the valid scalar range; regenerate with a new ephemeral key",
    );
  }
  const point = spendingPublicKey.add(Point.BASE.multiply(scalar));
  return bytesToHex(point.toBytes(false));
}

/** Last 20 bytes of the keccak of the uncompressed key body, checksummed. */
export function toAddress(uncompressedPublicKey: Hex): Address {
  return publicKeyToAddress(uncompressedPublicKey);
}

/**
 * `p_stealth = (p_spend + s_h) mod n`.
 *
 * The reduction matters: `p_spend + s_h` can exceed `n`, and the corresponding point arithmetic
 * `P_spend + s_h · G` wraps the same way, so the unreduced sum would not be the discrete log of the
 * stealth public key.
 */
export function stealthPrivateKey(spendingPrivateKey: Hex, hashedSharedSecret: Hex): Hex {
  const spend = decodePrivateKey(spendingPrivateKey, "spending private key");
  const sum = (spend + BigInt(hashedSharedSecret)) % CURVE_ORDER;
  if (sum === 0n) {
    throw new StealthError("derived stealth private key is zero; this payment is unspendable");
  }
  return encodePrivateKey(sum);
}

/** Fresh random scalar in `[1, n-1]`, from the platform CSPRNG. */
export function randomPrivateKey(): Hex {
  return bytesToHex(secp256k1.utils.randomSecretKey());
}
