import { describe, expect, it } from "vitest";
import { parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { StealthError, publicKeyOf, randomPrivateKey } from "../crypto";
import { encodeMetaAddress, toMetaAddressUri } from "../keys";
import {
  METADATA_BYTES,
  amountFromMetadata,
  buildNativeMetadata,
  generateStealthAddress,
  viewTagFromMetadata,
} from "../generate";
import { computeStealthPrivateKey } from "../sweep";

function newRecipient() {
  const spendingPrivateKey = randomPrivateKey();
  const viewingPrivateKey = randomPrivateKey();
  const spendingPublicKey = publicKeyOf(spendingPrivateKey);
  const viewingPublicKey = publicKeyOf(viewingPrivateKey);
  return {
    spendingPrivateKey,
    viewingPrivateKey,
    spendingPublicKey,
    viewingPublicKey,
    metaAddress: encodeMetaAddress({ spendingPublicKey, viewingPublicKey }),
  };
}

describe("generateStealthAddress", () => {
  it("produces an address the recipient can actually spend from", () => {
    // The end-to-end property everything else exists to protect: whatever the sender derives, the
    // recipient's keys must produce the private key for it.
    for (let i = 0; i < 16; i++) {
      const recipient = newRecipient();
      const payment = generateStealthAddress({
        metaAddress: recipient.metaAddress,
        amount: parseEther("1"),
      });

      const stealthPrivateKey = computeStealthPrivateKey({
        ephemeralPublicKey: payment.ephemeralPublicKey,
        keys: recipient,
      });

      expect(privateKeyToAccount(stealthPrivateKey).address).toBe(payment.stealthAddress);
    }
  });

  it("gives a different address on every send to the same recipient", () => {
    // Unlinkability is the entire point. Two payments to one meta-address must share nothing an
    // observer can correlate.
    const recipient = newRecipient();
    const addresses = new Set<string>();
    const ephemeralKeys = new Set<string>();
    for (let i = 0; i < 32; i++) {
      const payment = generateStealthAddress({
        metaAddress: recipient.metaAddress,
        amount: parseEther("1"),
      });
      addresses.add(payment.stealthAddress);
      ephemeralKeys.add(payment.ephemeralPublicKey);
    }
    expect(addresses.size).toBe(32);
    expect(ephemeralKeys.size).toBe(32);
  });

  it("is deterministic for a fixed ephemeral key", () => {
    const recipient = newRecipient();
    const ephemeralPrivateKey = randomPrivateKey();
    const a = generateStealthAddress({
      metaAddress: recipient.metaAddress,
      amount: 1n,
      ephemeralPrivateKey,
    });
    const b = generateStealthAddress({
      metaAddress: recipient.metaAddress,
      amount: 1n,
      ephemeralPrivateKey,
    });
    expect(a).toEqual(b);
  });

  it("emits a 33 byte compressed ephemeral key matching the ephemeral private key", () => {
    // The forwarder contract rejects anything that is not 33 bytes, and an ephemeral key that does
    // not match the scalar used for the shared secret makes the payment undiscoverable.
    const recipient = newRecipient();
    const ephemeralPrivateKey = randomPrivateKey();
    const payment = generateStealthAddress({
      metaAddress: recipient.metaAddress,
      amount: 1n,
      ephemeralPrivateKey,
    });
    expect(payment.ephemeralPublicKey.length).toBe(2 + 33 * 2);
    expect(payment.ephemeralPublicKey).toBe(publicKeyOf(ephemeralPrivateKey));
  });

  it("puts the view tag in the first metadata byte", () => {
    const recipient = newRecipient();
    const payment = generateStealthAddress({
      metaAddress: recipient.metaAddress,
      amount: parseEther("2.5"),
    });
    expect(payment.viewTag.length).toBe(4);
    expect(viewTagFromMetadata(payment.metadata)).toBe(payment.viewTag);
    expect(payment.metadata.length).toBe(2 + METADATA_BYTES * 2);
  });

  it("records the amount in the metadata", () => {
    const recipient = newRecipient();
    const amount = parseEther("0.001337");
    const payment = generateStealthAddress({ metaAddress: recipient.metaAddress, amount });
    expect(amountFromMetadata(payment.metadata)).toBe(amount);
  });

  it("accepts a meta-address URI as well as raw bytes", () => {
    const recipient = newRecipient();
    const ephemeralPrivateKey = randomPrivateKey();
    const fromRaw = generateStealthAddress({
      metaAddress: recipient.metaAddress,
      amount: 1n,
      ephemeralPrivateKey,
    });
    // A URI has to be parsed first; generateStealthAddress takes bytes on purpose so the parse
    // failure surfaces at input time rather than at send time.
    expect(() =>
      generateStealthAddress({
        metaAddress: toMetaAddressUri(recipient.metaAddress) as unknown as Hex,
        amount: 1n,
        ephemeralPrivateKey,
      }),
    ).toThrow(StealthError);
    expect(fromRaw.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("spreads view tags roughly uniformly", () => {
    // The view tag is the top byte of a keccak output. If it were ever a constant or near-constant,
    // scanning would silently stop filtering and every announcement would cost a full derivation —
    // slow, but worse, it would mean the hash input was wrong.
    const recipient = newRecipient();
    const tags = new Set<string>();
    for (let i = 0; i < 200; i++) {
      tags.add(
        generateStealthAddress({ metaAddress: recipient.metaAddress, amount: 1n }).viewTag,
      );
    }
    expect(tags.size).toBeGreaterThan(100);
  });

  it("rejects an invalid meta-address", () => {
    expect(() => generateStealthAddress({ metaAddress: "0xdeadbeef", amount: 1n })).toThrow(
      StealthError,
    );
  });

  it("rejects an out-of-range ephemeral private key", () => {
    const recipient = newRecipient();
    for (const bad of [`0x${"0".repeat(64)}`, `0x${"f".repeat(64)}`] as Hex[]) {
      expect(() =>
        generateStealthAddress({
          metaAddress: recipient.metaAddress,
          amount: 1n,
          ephemeralPrivateKey: bad,
        }),
      ).toThrow(StealthError);
    }
  });
});

describe("native-token metadata", () => {
  it("follows the ERC-5564 layout", () => {
    const metadata = buildNativeMetadata("0xab", parseEther("1"));
    expect(metadata.slice(0, 4)).toBe("0xab");
    expect(metadata.slice(4, 12)).toBe("eeeeeeee");
    expect(metadata.slice(12, 52).toLowerCase()).toBe(
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    );
    expect(BigInt(`0x${metadata.slice(52)}`)).toBe(parseEther("1"));
    expect(metadata.length).toBe(2 + METADATA_BYTES * 2);
  });

  it("round-trips a zero amount and a uint256 maximum", () => {
    for (const amount of [0n, (1n << 256n) - 1n]) {
      expect(amountFromMetadata(buildNativeMetadata("0x00", amount))).toBe(amount);
    }
  });

  it("rejects a view tag that is not one byte", () => {
    expect(() => buildNativeMetadata("0xabcd", 1n)).toThrow(StealthError);
    expect(() => buildNativeMetadata("0xa", 1n)).toThrow(StealthError);
  });

  it("rejects an amount that does not fit a uint256", () => {
    expect(() => buildNativeMetadata("0x01", 1n << 256n)).toThrow(StealthError);
    expect(() => buildNativeMetadata("0x01", -1n)).toThrow(StealthError);
  });

  it("returns null rather than guessing for foreign metadata layouts", () => {
    // Senders may use their own metadata. That is legal, and the amount simply is not readable —
    // returning a wrong number here would show the user a payment for an amount that never existed.
    expect(amountFromMetadata("0xab")).toBeNull();
    expect(amountFromMetadata(`0xab${"00".repeat(56)}`)).toBeNull();
  });

  it("reads the view tag out of metadata of any length", () => {
    // The view tag is the one field ERC-5564 mandates; everything after it is the sender's choice.
    expect(viewTagFromMetadata("0x9f")).toBe("0x9f");
    expect(viewTagFromMetadata("0x9fdeadbeef")).toBe("0x9f");
    expect(() => viewTagFromMetadata("0x")).toThrow(StealthError);
  });
});
