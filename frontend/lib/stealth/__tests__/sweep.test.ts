import { describe, expect, it, vi } from "vitest";
import { parseEther, parseGwei, type Address, type Hex, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { StealthError, publicKeyOf, randomPrivateKey } from "../crypto";
import { encodeMetaAddress, type StealthKeys } from "../keys";
import { generateStealthAddress } from "../generate";
import {
  FEE_BUFFER_PERCENT,
  NATIVE_TRANSFER_GAS,
  computeStealthPrivateKey,
  deriveSpendingAccountFor,
  quoteSweep,
} from "../sweep";

const DESTINATION = "0x4444444444444444444444444444444444444444" as Address;

function newRecipient(): StealthKeys {
  const spendingPrivateKey = randomPrivateKey();
  const viewingPrivateKey = randomPrivateKey();
  return {
    spendingPrivateKey,
    spendingPublicKey: publicKeyOf(spendingPrivateKey),
    viewingPrivateKey,
    viewingPublicKey: publicKeyOf(viewingPrivateKey),
  };
}

function paymentTo(keys: StealthKeys) {
  return generateStealthAddress({ metaAddress: encodeMetaAddress(keys), amount: parseEther("1") });
}

describe("computeStealthPrivateKey", () => {
  it("produces the key for the address the sender derived", () => {
    for (let i = 0; i < 16; i++) {
      const keys = newRecipient();
      const payment = paymentTo(keys);
      const privateKey = computeStealthPrivateKey({
        ephemeralPublicKey: payment.ephemeralPublicKey,
        keys,
      });
      expect(privateKeyToAccount(privateKey).address).toBe(payment.stealthAddress);
    }
  });

  it("stays inside the curve order", () => {
    // p_spend + s_h routinely exceeds n. Without the reduction the scalar is out of range and the
    // key does not correspond to the point the sender added to — an unspendable payment.
    for (let i = 0; i < 32; i++) {
      const keys = newRecipient();
      const payment = paymentTo(keys);
      const privateKey = computeStealthPrivateKey({
        ephemeralPublicKey: payment.ephemeralPublicKey,
        keys,
      });
      expect(privateKey.length).toBe(66);
      expect(() => privateKeyToAccount(privateKey)).not.toThrow();
    }
  });

  it("rejects a malformed ephemeral key", () => {
    const keys = newRecipient();
    expect(() =>
      computeStealthPrivateKey({ ephemeralPublicKey: "0xdeadbeef", keys }),
    ).toThrow(StealthError);
  });
});

describe("deriveSpendingAccountFor", () => {
  it("returns a key that controls the stealth address", () => {
    const keys = newRecipient();
    const payment = paymentTo(keys);
    const account = deriveSpendingAccountFor({
      stealthAddress: payment.stealthAddress,
      ephemeralPublicKey: payment.ephemeralPublicKey,
      keys,
    });
    expect(account.address).toBe(payment.stealthAddress);
    expect(privateKeyToAccount(account.privateKey).address).toBe(payment.stealthAddress);
  });

  it("refuses an announcement that is not ours", () => {
    // Deriving a key for someone else's payment gives a valid-looking key that controls nothing.
    // Catching it here is the difference between an error and a transaction that can never be
    // signed for.
    const us = newRecipient();
    const them = newRecipient();
    const theirPayment = paymentTo(them);
    expect(() =>
      deriveSpendingAccountFor({
        stealthAddress: theirPayment.stealthAddress,
        ephemeralPublicKey: theirPayment.ephemeralPublicKey,
        keys: us,
      }),
    ).toThrow(/do not control/i);
  });

  it("refuses when the announced address was tampered with", () => {
    const keys = newRecipient();
    const payment = paymentTo(keys);
    expect(() =>
      deriveSpendingAccountFor({
        stealthAddress: DESTINATION,
        ephemeralPublicKey: payment.ephemeralPublicKey,
        keys,
      }),
    ).toThrow(StealthError);
  });

  it("accepts a lowercased stealth address", () => {
    const keys = newRecipient();
    const payment = paymentTo(keys);
    expect(
      deriveSpendingAccountFor({
        stealthAddress: payment.stealthAddress.toLowerCase() as Address,
        ephemeralPublicKey: payment.ephemeralPublicKey,
        keys,
      }).address,
    ).toBe(payment.stealthAddress);
  });
});

type QuoteClientOptions = {
  balance: bigint;
  fees?: { maxFeePerGas: bigint; maxPriorityFeePerGas?: bigint };
  gasPrice?: bigint;
  estimateGas?: bigint | Error;
};

function quoteClient({ balance, fees, gasPrice, estimateGas }: QuoteClientOptions) {
  return {
    getBalance: async () => balance,
    estimateFeesPerGas: async () => {
      if (!fees) throw new Error("eth_feeHistory not supported");
      return fees;
    },
    getGasPrice: async () => {
      if (gasPrice === undefined) throw new Error("no gas price");
      return gasPrice;
    },
    estimateGas: async () => {
      if (estimateGas instanceof Error) throw estimateGas;
      return estimateGas ?? NATIVE_TRANSFER_GAS;
    },
  } as unknown as PublicClient;
}

describe("quoteSweep", () => {
  const stealthAddress = "0x5555555555555555555555555555555555555555" as Address;

  it("reserves gas out of the balance and forwards the rest", async () => {
    const client = quoteClient({
      balance: parseEther("1"),
      fees: { maxFeePerGas: parseGwei("10"), maxPriorityFeePerGas: parseGwei("1") },
    });
    const quote = await quoteSweep({ client, stealthAddress, to: DESTINATION });

    const expectedMaxFee = (parseGwei("10") * (100n + FEE_BUFFER_PERCENT)) / 100n;
    expect(quote.maxFeePerGas).toBe(expectedMaxFee);
    expect(quote.gas).toBe(NATIVE_TRANSFER_GAS);
    expect(quote.fee).toBe(NATIVE_TRANSFER_GAS * expectedMaxFee);
    expect(quote.value).toBe(quote.balance - quote.fee);
    expect(quote.value + quote.fee).toBe(quote.balance);
  });

  it("buffers the fee estimate upward", async () => {
    // The sweep spends everything minus the reserve, so a transaction priced at exactly the
    // estimate cannot be repriced if the base fee moves — there is nothing left to pay with.
    const client = quoteClient({
      balance: parseEther("1"),
      fees: { maxFeePerGas: parseGwei("10"), maxPriorityFeePerGas: parseGwei("1") },
    });
    const quote = await quoteSweep({ client, stealthAddress, to: DESTINATION });
    expect(quote.maxFeePerGas).toBeGreaterThan(parseGwei("10"));
  });

  it("falls back to eth_gasPrice when the node answers with no maxFeePerGas", async () => {
    // Not the same failure as a throw. A node that returns a fee object with maxFeePerGas undefined
    // would otherwise price the reserve at zero and leave nothing to pay gas with.
    const client = {
      getBalance: async () => parseEther("1"),
      estimateFeesPerGas: async () => ({ maxFeePerGas: undefined }),
      getGasPrice: async () => parseGwei("7"),
      estimateGas: async () => NATIVE_TRANSFER_GAS,
    } as unknown as PublicClient;
    const quote = await quoteSweep({ client, stealthAddress, to: DESTINATION });
    expect(quote.maxFeePerGas).toBe((parseGwei("7") * (100n + FEE_BUFFER_PERCENT)) / 100n);
    expect(quote.fee).toBeGreaterThan(0n);
  });

  it("falls back to eth_gasPrice on a chain without EIP-1559", async () => {
    // BOT Chain's fee market is not documented. A quote that only works on 1559 chains would fail
    // at the last step of the flow the whole listing depends on.
    const client = quoteClient({ balance: parseEther("1"), gasPrice: parseGwei("5") });
    const quote = await quoteSweep({ client, stealthAddress, to: DESTINATION });
    expect(quote.maxPriorityFeePerGas).toBeUndefined();
    expect(quote.maxFeePerGas).toBe((parseGwei("5") * (100n + FEE_BUFFER_PERCENT)) / 100n);
  });

  it("uses a higher gas estimate when the destination is a contract", async () => {
    const client = quoteClient({
      balance: parseEther("1"),
      fees: { maxFeePerGas: parseGwei("1") },
      estimateGas: 90_000n,
    });
    const quote = await quoteSweep({ client, stealthAddress, to: DESTINATION });
    expect(quote.gas).toBe(90_000n);
  });

  it("never goes below the cost of a plain transfer", async () => {
    // A node that under-estimates leaves the transaction unmineable and the balance stuck, since
    // there is no second attempt without more gas from somewhere.
    const client = quoteClient({
      balance: parseEther("1"),
      fees: { maxFeePerGas: parseGwei("1") },
      estimateGas: 1_000n,
    });
    expect((await quoteSweep({ client, stealthAddress, to: DESTINATION })).gas).toBe(
      NATIVE_TRANSFER_GAS,
    );
  });

  it("falls back to the plain-transfer gas when estimation fails", async () => {
    const client = quoteClient({
      balance: parseEther("1"),
      fees: { maxFeePerGas: parseGwei("1") },
      estimateGas: new Error("execution reverted"),
    });
    expect((await quoteSweep({ client, stealthAddress, to: DESTINATION })).gas).toBe(
      NATIVE_TRANSFER_GAS,
    );
  });

  it("refuses an empty address", async () => {
    const client = quoteClient({ balance: 0n, fees: { maxFeePerGas: parseGwei("1") } });
    await expect(quoteSweep({ client, stealthAddress, to: DESTINATION })).rejects.toThrow(
      /empty/i,
    );
  });

  it("refuses when the balance is worth less than the gas", async () => {
    // Dust payments are real, and building a transaction that consumes the whole balance in fees
    // and delivers nothing is worse than saying so.
    const client = quoteClient({
      balance: 1_000n,
      fees: { maxFeePerGas: parseGwei("10"), maxPriorityFeePerGas: parseGwei("1") },
    });
    await expect(quoteSweep({ client, stealthAddress, to: DESTINATION })).rejects.toThrow(
      /worth less than the gas/i,
    );
  });

  it("refuses when the balance exactly equals the fee", async () => {
    const maxFeePerGas = parseGwei("10");
    const buffered = (maxFeePerGas * (100n + FEE_BUFFER_PERCENT)) / 100n;
    const client = quoteClient({
      balance: NATIVE_TRANSFER_GAS * buffered,
      fees: { maxFeePerGas, maxPriorityFeePerGas: parseGwei("1") },
    });
    await expect(quoteSweep({ client, stealthAddress, to: DESTINATION })).rejects.toThrow(
      StealthError,
    );
  });

  it("honours a custom fee buffer", async () => {
    const client = quoteClient({
      balance: parseEther("1"),
      fees: { maxFeePerGas: parseGwei("10"), maxPriorityFeePerGas: parseGwei("1") },
    });
    const quote = await quoteSweep({
      client,
      stealthAddress,
      to: DESTINATION,
      feeBufferPercent: 0n,
    });
    expect(quote.maxFeePerGas).toBe(parseGwei("10"));
  });

  it("estimates against the stealth address as the sender", async () => {
    // Estimating from the wrong account would price a transfer the stealth address never makes.
    const estimateGas = vi.fn(async () => NATIVE_TRANSFER_GAS);
    const client = {
      getBalance: async () => parseEther("1"),
      estimateFeesPerGas: async () => ({ maxFeePerGas: parseGwei("1") }),
      getGasPrice: async () => parseGwei("1"),
      estimateGas,
    } as unknown as PublicClient;

    await quoteSweep({ client, stealthAddress, to: DESTINATION });
    expect(estimateGas).toHaveBeenCalledWith({
      account: stealthAddress,
      to: DESTINATION,
      value: 0n,
    });
  });
});

describe("sweep constants", () => {
  it("keeps a non-zero fee buffer", () => {
    expect(FEE_BUFFER_PERCENT).toBeGreaterThan(0n);
    expect(NATIVE_TRANSFER_GAS).toBe(21_000n);
  });
});
