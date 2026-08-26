import { describe, expect, it } from "vitest";
import { bytesToHex, hexToBytes, keccak256, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { secp256k1 } from "@noble/curves/secp256k1.js";
// Deep imports on purpose. The SDK's root barrel also pulls in its subgraph client, which needs a
// `graphql` peer dependency we have no other use for; the crypto modules themselves depend only on
// @noble/secp256k1 and viem.
import referenceGenerate from "@scopelift/stealth-address-sdk/dist/utils/crypto/generateStealthAddress.js";
import referenceCheck from "@scopelift/stealth-address-sdk/dist/utils/crypto/checkStealthAddress.js";
import referenceComputeStealthKey from "@scopelift/stealth-address-sdk/dist/utils/crypto/computeStealthKey.js";

/** Scheme 1, secp256k1 with view tags. The SDK's own enum value. */
const SCHEME_ID_1 = 1;
import { randomPrivateKey, publicKeyOf } from "../crypto";
import { encodeMetaAddress } from "../keys";
import { generateStealthAddress } from "../generate";
import { computeStealthPrivateKey } from "../sweep";

/**
 * Differential test against ScopeLift's `stealth-address-sdk`.
 *
 * ERC-5564 specifies scheme 1 in prose — "the secret is hashed" — without fixing which encoding of
 * the shared secret point is hashed. Two implementations can both follow the spec exactly and still
 * derive different stealth addresses. The ecosystem converged on ScopeLift's choices, so those are
 * the ones that matter, and this file is the only thing standing between us and a silent
 * incompatibility. Nothing here tests our code against our own assumptions: every assertion
 * compares our output to an independent implementation's.
 *
 * If this suite fails, do not adjust the expectations. Find out which side changed.
 */

const ROUNDS = 32;

describe("interoperability with the reference implementation", () => {
  it("derives the same stealth address, ephemeral key and view tag", () => {
    for (let i = 0; i < ROUNDS; i++) {
      const spendingPrivateKey = randomPrivateKey();
      const viewingPrivateKey = randomPrivateKey();
      const ephemeralPrivateKey = randomPrivateKey();

      const metaAddress = encodeMetaAddress({
        spendingPublicKey: publicKeyOf(spendingPrivateKey),
        viewingPublicKey: publicKeyOf(viewingPrivateKey),
      });

      const ours = generateStealthAddress({
        metaAddress,
        amount: 10n ** 18n,
        ephemeralPrivateKey,
      });

      const theirs = referenceGenerate({
        stealthMetaAddressURI: metaAddress,
        schemeId: SCHEME_ID_1,
        ephemeralPrivateKey: hexToBytes(ephemeralPrivateKey),
      });

      expect(ours.stealthAddress.toLowerCase()).toBe(theirs.stealthAddress.toLowerCase());
      expect(ours.ephemeralPublicKey.toLowerCase()).toBe(theirs.ephemeralPublicKey.toLowerCase());
      expect(ours.viewTag.toLowerCase()).toBe(theirs.viewTag.toLowerCase());
    }
  });

  it("recognises addresses the reference implementation generated", () => {
    for (let i = 0; i < ROUNDS; i++) {
      const spendingPrivateKey = randomPrivateKey();
      const viewingPrivateKey = randomPrivateKey();
      const spendingPublicKey = publicKeyOf(spendingPrivateKey);

      const metaAddress = encodeMetaAddress({
        spendingPublicKey,
        viewingPublicKey: publicKeyOf(viewingPrivateKey),
      });

      const theirs = referenceGenerate({
        stealthMetaAddressURI: metaAddress,
        schemeId: SCHEME_ID_1,
      });

      // The reference implementation agrees the payment is ours...
      expect(
        referenceCheck({
          ephemeralPublicKey: theirs.ephemeralPublicKey,
          schemeId: SCHEME_ID_1,
          spendingPublicKey,
          userStealthAddress: theirs.stealthAddress,
          viewingPrivateKey,
          viewTag: theirs.viewTag,
        }),
      ).toBe(true);

      // ...and so do we, by deriving a key that controls the address it chose.
      const stealthPrivateKey = computeStealthPrivateKey({
        ephemeralPublicKey: theirs.ephemeralPublicKey,
        keys: { spendingPrivateKey, viewingPrivateKey },
      });
      expect(addressOf(stealthPrivateKey).toLowerCase()).toBe(
        theirs.stealthAddress.toLowerCase(),
      );
    }
  });

  it("derives the same stealth private key", () => {
    for (let i = 0; i < ROUNDS; i++) {
      const spendingPrivateKey = randomPrivateKey();
      const viewingPrivateKey = randomPrivateKey();
      const ephemeralPublicKey = publicKeyOf(randomPrivateKey());

      const ours = computeStealthPrivateKey({
        ephemeralPublicKey,
        keys: { spendingPrivateKey, viewingPrivateKey },
      });

      const theirs = referenceComputeStealthKey({
        ephemeralPublicKey,
        schemeId: SCHEME_ID_1,
        spendingPrivateKey,
        viewingPrivateKey,
      });

      expect(ours.toLowerCase()).toBe(theirs.toLowerCase());
    }
  });

  it("hashes the compressed shared secret, not the uncompressed one", () => {
    // The specific choice this whole file exists to protect, asserted directly so a failure says
    // what went wrong rather than just "addresses differ".
    const viewingPrivateKey = randomPrivateKey();
    const ephemeralPrivateKey = randomPrivateKey();
    const metaAddress = encodeMetaAddress({
      spendingPublicKey: publicKeyOf(randomPrivateKey()),
      viewingPublicKey: publicKeyOf(viewingPrivateKey),
    });

    const { viewTag } = generateStealthAddress({
      metaAddress,
      amount: 1n,
      ephemeralPrivateKey,
    });

    const viewingPublicKey = publicKeyOf(viewingPrivateKey);
    const point = secp256k1.Point.fromBytes(hexToBytes(viewingPublicKey));
    const product = point.multiply(BigInt(ephemeralPrivateKey));

    const compressedTag = keccak256(bytesToHex(product.toBytes(true))).slice(0, 4);
    const uncompressedTag = keccak256(bytesToHex(product.toBytes(false))).slice(0, 4);

    expect(viewTag).toBe(compressedTag);
    expect(compressedTag).not.toBe(uncompressedTag);
  });
});

function addressOf(privateKey: Hex): string {
  return privateKeyToAccount(privateKey).address;
}
