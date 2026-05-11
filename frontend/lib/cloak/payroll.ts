import {
  transact,
  partialWithdraw,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  isRootNotFoundError,
  CLOAK_PROGRAM_ID,
  type MerkleTree,
  type Utxo,
} from "@cloak.dev/sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { applyBufferPolyfill } from "@/lib/buffer-polyfill";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_ENDPOINT!;
const RELAY_URL = "https://api.cloak.ag";

// USDC on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Relay needs ~4s to index before the next partialWithdraw can build a clean proof
const RELAY_SETTLE_DELAY_MS = 4000;
const STALE_RETRY_MAX = 2;
const STALE_RETRY_DELAY_MS = 4000;

export interface PayrollRecipient {
  name: string;
  wallet: string;
  amount: number; // USDC decimal units (e.g. 10.5)
}

export interface PayrollResult {
  name: string;
  wallet: string;
  amount: number;
  signature: string;
  status: "success" | "error";
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SignFn = (tx: any) => Promise<any>;
type SignMsgFn = (msg: Uint8Array) => Promise<Uint8Array>;

function isStaleNoteError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return msg.includes("stale") || msg.includes("leaf index") || msg.includes("beyond next_index");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function disbursePayroll(
  recipients: PayrollRecipient[],
  walletPublicKey: string,
  signTransaction: SignFn,
  signMessage: SignMsgFn,
  onProgress?: (phase: "depositing" | "paying", index: number, total: number, name: string) => void,
): Promise<PayrollResult[]> {
  applyBufferPolyfill();

  const connection = new Connection(RPC_URL, "confirmed");
  const sender = new PublicKey(walletPublicKey);

  const total = recipients.reduce(
    (sum, r) => sum + BigInt(Math.round(r.amount * 1_000_000)),
    0n,
  );

  const transactOpts = {
    connection,
    programId: CLOAK_PROGRAM_ID,
    relayUrl: RELAY_URL,
    walletPublicKey: sender,
    depositorPublicKey: sender,
    signTransaction,
    signMessage,
    enforceViewingKeyRegistration: false,
  };

  // --- Step 1: one deposit for the entire batch ---
  onProgress?.("depositing", 0, recipients.length, "");

  const ephemeralKeypair = await generateUtxoKeypair();
  const depositOutput = await createUtxo(total, ephemeralKeypair, USDC_MINT);

  const depositResult = await transact(
    {
      inputUtxos: [await createZeroUtxo(USDC_MINT)],
      outputUtxos: [depositOutput],
      externalAmount: total,
      depositor: sender,
    },
    transactOpts,
  );

  // --- Step 2: partialWithdraw per recipient, chaining change UTXOs ---
  let currentUtxo: Utxo = depositResult.outputUtxos[0];
  let cachedTree: MerkleTree | undefined = depositResult.merkleTree;

  const results: PayrollResult[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    onProgress?.("paying", i, recipients.length, recipient.name);

    await sleep(RELAY_SETTLE_DELAY_MS);

    const amountMicro = BigInt(Math.round(recipient.amount * 1_000_000));
    const recipientPubkey = new PublicKey(recipient.wallet);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= STALE_RETRY_MAX) {
      try {
        const result = await partialWithdraw(
          [currentUtxo],
          recipientPubkey,
          amountMicro,
          {
            ...transactOpts,
            cachedMerkleTree: attempt === 0 ? cachedTree : undefined,
          },
        );

        currentUtxo = result.outputUtxos[0];
        cachedTree = result.merkleTree ?? cachedTree;

        results.push({
          name: recipient.name,
          wallet: recipient.wallet,
          amount: recipient.amount,
          signature: result.signature,
          status: "success",
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if ((isStaleNoteError(lastError) || isRootNotFoundError(lastError)) && attempt < STALE_RETRY_MAX) {
          cachedTree = undefined;
          await sleep(STALE_RETRY_DELAY_MS);
          attempt++;
          continue;
        }
        break;
      }
    }

    if (lastError) {
      results.push({
        name: recipient.name,
        wallet: recipient.wallet,
        amount: recipient.amount,
        signature: "",
        status: "error",
        error: lastError.message,
      });
    }
  }

  return results;
}
