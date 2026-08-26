import {
  createWalletClient,
  http,
  type Address,
  type Chain,
  type Hex,
  type PublicClient,
  type Transport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  StealthError,
  decodePublicKey,
  hashSharedSecret,
  sharedSecret,
  stealthPrivateKey as addSpendAndSecret,
  stealthPublicKey,
  toAddress,
  decodePrivateKey,
} from "./crypto";
import type { StealthKeys } from "./keys";

/**
 * Spending side: turn a discovered payment into a private key, then move the funds off it.
 *
 * A stealth address is only private while it holds one payment from one sender. Sweeping to the
 * user's own visible wallet is where the privacy ends — that transaction links the stealth address
 * to them. It is still worth doing, because it links *the recipient* to the stealth address, not to
 * the sender, and the sender never learns which wallet the money ended up in. Callers should let
 * the user choose the destination rather than defaulting to their connected account.
 */

/** Derive the private key for a stealth address we were paid at. */
export function computeStealthPrivateKey({
  ephemeralPublicKey,
  keys,
}: {
  ephemeralPublicKey: Hex;
  keys: Pick<StealthKeys, "spendingPrivateKey" | "viewingPrivateKey">;
}): Hex {
  const viewingScalar = decodePrivateKey(keys.viewingPrivateKey, "viewing private key");
  const ephemeralPoint = decodePublicKey(ephemeralPublicKey, "ephemeral public key");
  const hashed = hashSharedSecret(sharedSecret(viewingScalar, ephemeralPoint));
  return addSpendAndSecret(keys.spendingPrivateKey, hashed);
}

/**
 * Derive the key and check it actually controls the address the payment went to.
 *
 * The check is cheap and the failure it catches is expensive: a wrong ephemeral key, a
 * meta-address the sender derived against a different key version, or a stale key set all produce a
 * private key that looks fine and controls nothing. Better to fail here than to build and broadcast
 * a transaction that can never be signed for.
 */
export function deriveSpendingAccountFor({
  stealthAddress,
  ephemeralPublicKey,
  keys,
}: {
  stealthAddress: Address;
  ephemeralPublicKey: Hex;
  keys: Pick<StealthKeys, "spendingPrivateKey" | "viewingPrivateKey" | "spendingPublicKey">;
}): { privateKey: Hex; address: Address } {
  const viewingScalar = decodePrivateKey(keys.viewingPrivateKey, "viewing private key");
  const ephemeralPoint = decodePublicKey(ephemeralPublicKey, "ephemeral public key");
  const hashed = hashSharedSecret(sharedSecret(viewingScalar, ephemeralPoint));

  const expected = toAddress(
    stealthPublicKey(decodePublicKey(keys.spendingPublicKey, "spending public key"), hashed),
  );
  if (expected.toLowerCase() !== stealthAddress.toLowerCase()) {
    throw new StealthError(
      "These keys do not control that stealth address. The announcement may not be yours, or it " +
        "was sent to a different set of stealth keys.",
    );
  }

  const privateKey = addSpendAndSecret(keys.spendingPrivateKey, hashed);
  const account = privateKeyToAccount(privateKey);
  if (account.address.toLowerCase() !== stealthAddress.toLowerCase()) {
    // The private key and public key derivations disagreeing means one of them is wrong, and there
    // is no safe way to guess which. Never broadcast on this path.
    throw new StealthError(
      "Derived stealth private key does not match the derived stealth address.",
    );
  }

  return { privateKey, address: account.address };
}

/** Gas for a plain native transfer to an EOA. Estimated per-sweep; this is the floor and fallback. */
export const NATIVE_TRANSFER_GAS = 21_000n;

/**
 * Headroom on the fee estimate, in percent.
 *
 * The sweep spends the entire balance minus a fee reserve, so if the fee rises between estimating
 * and mining, the transaction cannot be repriced — there is nothing left to pay the difference
 * with. Over-reserving strands dust; under-reserving strands the whole balance.
 */
export const FEE_BUFFER_PERCENT = 25n;

/**
 * Below this, a stealth address is empty for practical purposes.
 *
 * A sweep reserves `gas × maxFeePerGas` with a buffer, but EIP-1559 refunds the difference between
 * that ceiling and the price actually paid, so a remainder is left behind every time. It is not a
 * bug and it cannot be swept: any transaction moving it costs more than it is worth. Offering a
 * "claim" for it produces a button that can only ever fail, so the UI needs to recognise dust
 * rather than treating a non-zero balance as claimable.
 *
 * Expressed in gas units so it tracks the fee market instead of being a hardcoded wei figure.
 */
export const DUST_GAS_MULTIPLE = 2n;

/**
 * Whether a balance is worth moving at the current gas price.
 *
 * Two transfers' worth, not one: a balance that barely covers its own fee delivers nothing after
 * paying it.
 */
export function isDust(balance: bigint, gasPrice: bigint): boolean {
  return balance < NATIVE_TRANSFER_GAS * gasPrice * DUST_GAS_MULTIPLE;
}

export type SweepQuote = {
  balance: bigint;
  gas: bigint;
  /** The per-gas price the reserve was computed against, buffer already applied. */
  maxFeePerGas: bigint;
  maxPriorityFeePerGas?: bigint;
  /** What the reserve holds back. Actual cost is usually lower; the difference stays behind. */
  fee: bigint;
  /** Balance minus fee. */
  value: bigint;
};

/**
 * Work out how much of a stealth address's balance can actually be sent onward.
 *
 * Returns a quote rather than sending, so the UI can show the user the fee before they commit and
 * can refuse gracefully when a payment is worth less than it costs to move.
 */
export async function quoteSweep({
  client,
  stealthAddress,
  to,
  feeBufferPercent = FEE_BUFFER_PERCENT,
}: {
  client: PublicClient;
  stealthAddress: Address;
  to: Address;
  feeBufferPercent?: bigint;
}): Promise<SweepQuote> {
  const [balance, fees] = await Promise.all([
    client.getBalance({ address: stealthAddress }),
    resolveFees(client),
  ]);

  if (balance === 0n) {
    throw new StealthError("This stealth address is empty.");
  }

  // Estimating from a zero-value call keeps the estimate independent of the amount we have not
  // worked out yet, and still catches a destination that costs more than a plain transfer.
  const gas = await client
    .estimateGas({ account: stealthAddress, to, value: 0n })
    .then((estimate) => (estimate > NATIVE_TRANSFER_GAS ? estimate : NATIVE_TRANSFER_GAS))
    .catch(() => NATIVE_TRANSFER_GAS);

  const maxFeePerGas = (fees.maxFeePerGas * (100n + feeBufferPercent)) / 100n;
  const fee = gas * maxFeePerGas;

  if (balance <= fee) {
    throw new StealthError(
      "This payment is worth less than the gas needed to move it. Wait for a lower fee, or leave it.",
    );
  }

  return {
    balance,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
    fee,
    value: balance - fee,
  };
}

/**
 * Fee parameters for whichever fee market this chain actually has.
 *
 * BOT Chain's is undocumented. viem's `estimateFeesPerGas` throws on a chain with no
 * `baseFeePerGas`, but a node can also answer with an undefined `maxFeePerGas` instead of failing,
 * and that path would silently price the sweep at zero and reserve nothing for gas — so both cases
 * fall through to `eth_gasPrice`.
 */
async function resolveFees(client: PublicClient): Promise<{
  maxFeePerGas: bigint;
  maxPriorityFeePerGas?: bigint;
}> {
  try {
    const fees = await client.estimateFeesPerGas();
    if (fees.maxFeePerGas) {
      return {
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      };
    }
  } catch {
    // Pre-1559 chain, or a node without eth_feeHistory.
  }
  return { maxFeePerGas: await client.getGasPrice() };
}

export type SweepParams = {
  client: PublicClient;
  chain: Chain;
  /** Transport for the sweeping wallet client. Defaults to HTTP against the chain's own RPC. */
  transport?: Transport;
  /** The address the payment landed at, checked against the derived key before anything is sent. */
  stealthAddress: Address;
  /** The announced ephemeral public key for that payment. */
  ephemeralPublicKey: Hex;
  keys: Pick<StealthKeys, "spendingPrivateKey" | "viewingPrivateKey" | "spendingPublicKey">;
  /** Where the funds go. */
  to: Address;
  feeBufferPercent?: bigint;
};

/**
 * Move a stealth payment to a destination the user chose.
 *
 * The stealth address has no gas of its own beyond the payment itself, so the fee comes out of the
 * balance and the rest is forwarded. There is no partial-sweep mode: leaving a remainder behind
 * leaves a second address to sweep later at another full fee, for dust.
 */
export async function sweepStealthPayment({
  client,
  chain,
  transport,
  stealthAddress,
  ephemeralPublicKey,
  keys,
  to,
  feeBufferPercent,
}: SweepParams): Promise<{ hash: Hex; quote: SweepQuote }> {
  const { privateKey } = deriveSpendingAccountFor({ stealthAddress, ephemeralPublicKey, keys });
  const quote = await quoteSweep({ client, stealthAddress, to, feeBufferPercent });

  const wallet = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport: transport ?? http(chain.rpcUrls.default.http[0]),
  });

  const hash = await wallet.sendTransaction({
    to,
    value: quote.value,
    gas: quote.gas,
    ...(quote.maxPriorityFeePerGas === undefined
      ? { gasPrice: quote.maxFeePerGas }
      : {
          maxFeePerGas: quote.maxFeePerGas,
          maxPriorityFeePerGas: quote.maxPriorityFeePerGas,
        }),
  });

  return { hash, quote };
}
