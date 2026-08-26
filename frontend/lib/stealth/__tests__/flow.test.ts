import { describe, expect, it } from "vitest";
import {
  custom,
  parseEther,
  parseGwei,
  parseTransaction,
  recoverTransactionAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { bohrTestnet } from "../../botchain/chain";
import { publicKeyOf, randomPrivateKey } from "../crypto";
import { encodeMetaAddress, toViewingKeys, type StealthKeys } from "../keys";
import { generateStealthAddress } from "../generate";
import { checkAnnouncements, type Announcement } from "../scan";
import { sweepStealthPayment } from "../sweep";

/**
 * The whole loop: a sender derives an address from a published meta-address, the announcement goes
 * out, the recipient finds it among other people's traffic, and the funds move to a destination
 * the recipient chose — with the raw transaction checked to actually originate from the stealth
 * address, which is the only way to know the derived key is the real one.
 */

const DESTINATION = "0x6666666666666666666666666666666666666666" as Address;

function newUser(): StealthKeys {
  const spendingPrivateKey = randomPrivateKey();
  const viewingPrivateKey = randomPrivateKey();
  return {
    spendingPrivateKey,
    spendingPublicKey: publicKeyOf(spendingPrivateKey),
    viewingPrivateKey,
    viewingPublicKey: publicKeyOf(viewingPrivateKey),
  };
}

function announcementFor(keys: StealthKeys, amount: bigint, index: number): Announcement {
  const payment = generateStealthAddress({ metaAddress: encodeMetaAddress(keys), amount });
  return {
    schemeId: 1n,
    stealthAddress: payment.stealthAddress,
    caller: "0x7777777777777777777777777777777777777777",
    ephemeralPubKey: payment.ephemeralPublicKey,
    metadata: payment.metadata,
    blockNumber: BigInt(index + 1),
    transactionHash: `0x${index.toString(16).padStart(64, "0")}` as Hex,
    logIndex: index,
  };
}

describe("send, discover, sweep", () => {
  it("moves a payment end to end and signs it as the stealth address", async () => {
    const alice = newUser();
    const bob = newUser();

    // A payment to Bob, buried in traffic that is not his.
    const amount = parseEther("2");
    const announcements = [
      announcementFor(alice, parseEther("5"), 0),
      announcementFor(bob, amount, 1),
      announcementFor(alice, parseEther("0.1"), 2),
    ];

    const matches = checkAnnouncements(announcements, toViewingKeys(bob));
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match.amount).toBe(amount);

    // Alice, scanning the same logs, finds her own two and not Bob's.
    expect(checkAnnouncements(announcements, toViewingKeys(alice))).toHaveLength(2);

    let sentRaw: Hex | undefined;
    const client = {
      getBalance: async () => amount,
      estimateFeesPerGas: async () => ({
        maxFeePerGas: parseGwei("2"),
        maxPriorityFeePerGas: parseGwei("1"),
      }),
      getGasPrice: async () => parseGwei("2"),
      estimateGas: async () => 21_000n,
    } as unknown as PublicClient;

    const provider = {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        switch (method) {
          case "eth_chainId":
            return `0x${bohrTestnet.id.toString(16)}`;
          case "eth_getTransactionCount":
            return "0x0";
          case "eth_sendRawTransaction":
            sentRaw = (params as Hex[])[0];
            return "0xabc";
          default:
            throw new Error(`unexpected RPC call: ${method}`);
        }
      },
    };

    const { quote } = await sweepStealthPayment({
      client,
      chain: bohrTestnet,
      transport: custom(provider),
      stealthAddress: match.stealthAddress,
      ephemeralPublicKey: match.ephemeralPubKey,
      keys: bob,
      to: DESTINATION,
    });

    expect(sentRaw).toBeDefined();

    // The signature is what proves the derivation: a node would credit this transaction to
    // whatever address recovers from it, and that has to be the address the payment went to.
    const signer = await recoverTransactionAddress({
      serializedTransaction: sentRaw as `0x02${string}`,
    });
    expect(signer.toLowerCase()).toBe(match.stealthAddress.toLowerCase());

    const parsed = parseTransaction(sentRaw!);
    expect(parsed.to?.toLowerCase()).toBe(DESTINATION.toLowerCase());
    expect(parsed.value).toBe(quote.value);
    expect(parsed.chainId).toBe(bohrTestnet.id);

    // Everything that arrived leaves, minus the reserve — nothing is stranded beyond the fee.
    expect(parsed.value! + quote.fee).toBe(amount);
    expect(parsed.value).toBeLessThan(amount);
  });

  it("keeps two payments to the same recipient unlinkable on chain", async () => {
    // The property the product claims. Two sends to one meta-address must share no observable
    // field, while both still resolve to keys the recipient holds.
    const bob = newUser();
    const first = announcementFor(bob, parseEther("1"), 0);
    const second = announcementFor(bob, parseEther("1"), 1);

    expect(first.stealthAddress).not.toBe(second.stealthAddress);
    expect(first.ephemeralPubKey).not.toBe(second.ephemeralPubKey);

    const matches = checkAnnouncements([first, second], toViewingKeys(bob));
    expect(matches).toHaveLength(2);
  });
});
