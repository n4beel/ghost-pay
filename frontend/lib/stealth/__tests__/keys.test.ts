import { describe, expect, it } from "vitest";
import { keccak256, stringToHex, type Hex } from "viem";
import { CURVE_ORDER, StealthError, publicKeyOf, randomPrivateKey } from "../crypto";
import {
  STEALTH_KEY_MESSAGE,
  assertDeterministicDerivation,
  decodeMetaAddress,
  deriveStealthKeys,
  encodeMetaAddress,
  isValidMetaAddress,
  metaAddressFingerprint,
  parseMetaAddressUri,
  toMetaAddressUri,
  toViewingKeys,
} from "../keys";

const SIGNATURE_A =
  ("0x" +
    "b8f5e4f6ee5cae90cbc7a2cbe4a5f2b6d3d3f6ab1cf3e2d1b0a9988776655443" +
    "2f1e0d9c8b7a695847362514039281706f5e4d3c2b1a09f8e7d6c5b4a3928170" +
    "1b") as Hex;

const SIGNATURE_B =
  ("0x" +
    "1111111111111111111111111111111111111111111111111111111111111111" +
    "2222222222222222222222222222222222222222222222222222222222222222" +
    "1c") as Hex;

describe("deriveStealthKeys", () => {
  it("is deterministic for the same signature", () => {
    expect(deriveStealthKeys(SIGNATURE_A)).toEqual(deriveStealthKeys(SIGNATURE_A));
  });

  it("gives different keys for different signatures", () => {
    const a = deriveStealthKeys(SIGNATURE_A);
    const b = deriveStealthKeys(SIGNATURE_B);
    expect(a.spendingPrivateKey).not.toBe(b.spendingPrivateKey);
    expect(a.viewingPrivateKey).not.toBe(b.viewingPrivateKey);
  });

  it("keeps the spending and viewing keys independent", () => {
    // Both keys come from the same seed. If the domain separators were dropped or made equal, one
    // key would be enough to compute the other, and the viewing key would silently carry spend
    // authority — the exact property that makes a watch-only scanner safe.
    const keys = deriveStealthKeys(SIGNATURE_A);
    expect(keys.spendingPrivateKey).not.toBe(keys.viewingPrivateKey);
    expect(keys.spendingPublicKey).not.toBe(keys.viewingPublicKey);
  });

  it("produces public keys that match their private keys", () => {
    const keys = deriveStealthKeys(SIGNATURE_A);
    expect(keys.spendingPublicKey).toBe(publicKeyOf(keys.spendingPrivateKey));
    expect(keys.viewingPublicKey).toBe(publicKeyOf(keys.viewingPrivateKey));
  });

  it("produces scalars inside the curve order", () => {
    for (let i = 0; i < 64; i++) {
      const signature = (keccak256(stringToHex(`sig-${i}`)) +
        keccak256(stringToHex(`sig2-${i}`)).slice(2) +
        "1b") as Hex;
      const keys = deriveStealthKeys(signature);
      for (const key of [keys.spendingPrivateKey, keys.viewingPrivateKey]) {
        expect(BigInt(key)).toBeGreaterThan(0n);
        expect(BigInt(key)).toBeLessThan(CURVE_ORDER);
        expect(key.length).toBe(66);
      }
    }
  });

  it("rejects signatures that are not 65 bytes", () => {
    // A wallet that returns a 64-byte compact signature must not be silently accepted: the derived
    // keys would differ from the 65-byte path and the user would lose access on the next session.
    expect(() => deriveStealthKeys(SIGNATURE_A.slice(0, -2) as Hex)).toThrow(StealthError);
    expect(() => deriveStealthKeys((SIGNATURE_A + "00") as Hex)).toThrow(StealthError);
    expect(() => deriveStealthKeys("0x" as Hex)).toThrow(StealthError);
  });

  it("rejects non-hex and unprefixed input", () => {
    expect(() => deriveStealthKeys(SIGNATURE_A.slice(2) as Hex)).toThrow(StealthError);
    expect(() =>
      deriveStealthKeys((SIGNATURE_A.slice(0, -2) + "zz") as Hex),
    ).toThrow(StealthError);
  });

it("changes completely when the recovery byte changes", () => {
    // The whole signature is hashed, v included. A wallet that flips between v=27 and v=28 for the
    // same message is as fatal as one that randomises r and s, and this makes that visible rather
    // than letting the last byte quietly not matter.
    const flipped = (SIGNATURE_A.slice(0, -2) + "1c") as Hex;
    const original = deriveStealthKeys(SIGNATURE_A);
    const changed = deriveStealthKeys(flipped);
    expect(changed.spendingPrivateKey).not.toBe(original.spendingPrivateKey);
    expect(changed.viewingPrivateKey).not.toBe(original.viewingPrivateKey);
  });
});

describe("STEALTH_KEY_MESSAGE", () => {
  it("is versioned and names the app", () => {
    // Not a style check. This string is the input to every user's key derivation forever; the
    // version marker is the only thing that makes an intentional change distinguishable from a
    // careless edit, and the app name is what stops the same signature being harvested elsewhere.
    expect(STEALTH_KEY_MESSAGE).toContain("Ghost Pay");
    expect(STEALTH_KEY_MESSAGE).toContain("v1");
  });
});

describe("assertDeterministicDerivation", () => {
  it("returns the keys when both signatures agree", () => {
    expect(assertDeterministicDerivation(SIGNATURE_A, SIGNATURE_A)).toEqual(
      deriveStealthKeys(SIGNATURE_A),
    );
  });

  it("throws when the wallet signed the same message two different ways", () => {
    // The MPC landmine. An MPC or threshold signer is not obliged to be deterministic, and if it is
    // not, every session gives the user a different meta-address and strands the previous one.
    expect(() => assertDeterministicDerivation(SIGNATURE_A, SIGNATURE_B)).toThrow(
      /different signatures/i,
    );
  });
});

describe("meta-address encoding", () => {
  const keys = deriveStealthKeys(SIGNATURE_A);
  const metaAddress = encodeMetaAddress(keys);

  it("round-trips", () => {
    expect(decodeMetaAddress(metaAddress)).toEqual({
      spendingPublicKey: keys.spendingPublicKey,
      viewingPublicKey: keys.viewingPublicKey,
    });
  });

  it("is 66 bytes, spending key first", () => {
    expect(metaAddress.length).toBe(2 + 66 * 2);
    expect(metaAddress.startsWith(keys.spendingPublicKey)).toBe(true);
    expect(metaAddress.endsWith(keys.viewingPublicKey.slice(2))).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(() => decodeMetaAddress(keys.spendingPublicKey)).toThrow(StealthError);
    expect(() => decodeMetaAddress((metaAddress + "00") as Hex)).toThrow(StealthError);
  });

  it("rejects a key that is not on the curve", () => {
    // A point off the curve reaching the sender path produces a stealth address whose private key
    // nobody holds. There is no recovery from that, so it has to fail at the door.
    const offCurve = ("0x02" + "f".repeat(64)) as Hex;
    expect(() =>
      decodeMetaAddress((offCurve + keys.viewingPublicKey.slice(2)) as Hex),
    ).toThrow(StealthError);
    expect(() =>
      decodeMetaAddress((keys.spendingPublicKey + offCurve.slice(2)) as Hex),
    ).toThrow(StealthError);
  });

  it("rejects an uncompressed key prefix", () => {
    const bad = ("0x04" + keys.spendingPublicKey.slice(4)) as Hex;
    expect(() =>
      decodeMetaAddress((bad + keys.viewingPublicKey.slice(2)) as Hex),
    ).toThrow(/compressed/i);
  });

  it("validates without throwing via isValidMetaAddress", () => {
    expect(isValidMetaAddress(metaAddress)).toBe(true);
    expect(isValidMetaAddress("0xdeadbeef")).toBe(false);
    expect(isValidMetaAddress("not an address")).toBe(false);
  });
});

describe("meta-address URIs", () => {
  const metaAddress = encodeMetaAddress(deriveStealthKeys(SIGNATURE_A));

  it("round-trips through the st: form", () => {
    const uri = toMetaAddressUri(metaAddress);
    expect(uri).toBe(`st:bot:${metaAddress}`);
    expect(parseMetaAddressUri(uri)).toBe(metaAddress);
  });

  it("accepts a bare meta-address", () => {
    expect(parseMetaAddressUri(metaAddress)).toBe(metaAddress);
  });

  it("accepts another chain's label", () => {
    // The keys are chain-independent. Rejecting st:eth: would only teach users to hand-edit it.
    expect(parseMetaAddressUri(`st:eth:${metaAddress}`)).toBe(metaAddress);
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseMetaAddressUri(`  st:bot:${metaAddress}\n`)).toBe(metaAddress);
  });

  it("rejects malformed URIs", () => {
    expect(() => parseMetaAddressUri(`xx:bot:${metaAddress}`)).toThrow(StealthError);
    expect(() => parseMetaAddressUri("st:bot")).toThrow(StealthError);
    expect(() => parseMetaAddressUri("st:bot:0xdead")).toThrow(StealthError);
  });
});

describe("toViewingKeys", () => {
  it("drops the spending private key", () => {
    const keys = deriveStealthKeys(SIGNATURE_A);
    const viewing = toViewingKeys(keys);
    expect(viewing).toEqual({
      spendingPublicKey: keys.spendingPublicKey,
      viewingPrivateKey: keys.viewingPrivateKey,
    });
    expect(Object.values(viewing)).not.toContain(keys.spendingPrivateKey);
  });
});

describe("metaAddressFingerprint", () => {
  it("is stable and short", () => {
    const metaAddress = encodeMetaAddress(deriveStealthKeys(SIGNATURE_A));
    expect(metaAddressFingerprint(metaAddress)).toBe(metaAddressFingerprint(metaAddress));
    expect(metaAddressFingerprint(metaAddress).length).toBeLessThan(20);
  });

  it("differs between identities", () => {
    const a = encodeMetaAddress(deriveStealthKeys(SIGNATURE_A));
    const b = encodeMetaAddress(deriveStealthKeys(SIGNATURE_B));
    expect(metaAddressFingerprint(a)).not.toBe(metaAddressFingerprint(b));
  });
});

describe("randomPrivateKey", () => {
  it("returns distinct in-range scalars", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 128; i++) {
      const key = randomPrivateKey();
      expect(key.length).toBe(66);
      expect(BigInt(key)).toBeGreaterThan(0n);
      expect(BigInt(key)).toBeLessThan(CURVE_ORDER);
      seen.add(key);
    }
    expect(seen.size).toBe(128);
  });
});
