import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { publicKeyOf } from "../crypto";
import { deriveStealthKeys, decodeMetaAddress, encodeMetaAddress } from "../keys";
import { generateStealthAddress } from "../generate";
import { computeStealthPrivateKey } from "../sweep";
import { KEY_VECTORS, STEALTH_VECTORS } from "./vectors";

/** Known-answer tests. See `vectors.ts` for where the expected values came from. */

describe("ERC-5564 scheme 1 known-answer vectors", () => {
  it.each(STEALTH_VECTORS)(
    "generates the expected stealth address for $stealthAddress",
    (vector) => {
      const result = generateStealthAddress({
        metaAddress: vector.metaAddress,
        amount: 0n,
        ephemeralPrivateKey: vector.ephemeralPrivateKey,
      });

      expect(result.stealthAddress).toBe(vector.stealthAddress);
      expect(result.ephemeralPublicKey).toBe(vector.ephemeralPublicKey);
      expect(result.viewTag).toBe(vector.viewTag);
    },
  );

  it.each(STEALTH_VECTORS)(
    "recovers the expected stealth private key for $stealthAddress",
    (vector) => {
      const stealthPrivateKey = computeStealthPrivateKey({
        ephemeralPublicKey: vector.ephemeralPublicKey,
        keys: {
          spendingPrivateKey: vector.spendingPrivateKey,
          viewingPrivateKey: vector.viewingPrivateKey,
        },
      });

      expect(stealthPrivateKey).toBe(vector.stealthPrivateKey);
      expect(privateKeyToAccount(stealthPrivateKey).address).toBe(vector.stealthAddress);
    },
  );

  it.each(STEALTH_VECTORS)("derives the expected public keys for $stealthAddress", (vector) => {
    expect(publicKeyOf(vector.spendingPrivateKey)).toBe(vector.spendingPublicKey);
    expect(publicKeyOf(vector.viewingPrivateKey)).toBe(vector.viewingPublicKey);
    expect(
      encodeMetaAddress({
        spendingPublicKey: vector.spendingPublicKey,
        viewingPublicKey: vector.viewingPublicKey,
      }),
    ).toBe(vector.metaAddress);
    expect(decodeMetaAddress(vector.metaAddress)).toEqual({
      spendingPublicKey: vector.spendingPublicKey,
      viewingPublicKey: vector.viewingPublicKey,
    });
  });
});

describe("signature-derived key vectors", () => {
  it.each(KEY_VECTORS)("derives stable keys from $signature", (vector) => {
    const keys = deriveStealthKeys(vector.signature);
    expect(keys.spendingPrivateKey).toBe(vector.spendingPrivateKey);
    expect(keys.spendingPublicKey).toBe(vector.spendingPublicKey);
    expect(keys.viewingPrivateKey).toBe(vector.viewingPrivateKey);
    expect(keys.viewingPublicKey).toBe(vector.viewingPublicKey);
  });
});

describe("secp256k1 address derivation", () => {
  it("matches the canonical private-key-1 address", () => {
    // The most widely published secp256k1-to-Ethereum-address vector there is. If `toAddress` were
    // hashing the wrong slice of the key, every other test here would still pass consistently
    // while producing addresses no wallet agrees with.
    const one = `0x${"0".repeat(63)}1` as const;
    expect(publicKeyOf(one)).toBe(
      "0x0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
    );
    expect(privateKeyToAccount(one).address).toBe("0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
  });
});
