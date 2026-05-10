import {
  getClaimableUtxoScannerFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
  getUmbraRelayer,
} from "@umbra-privacy/sdk";
import type { UmbraClient } from "./client";
import { getClaimProver } from "./prover";

const RELAYER_URL =
  process.env.NEXT_PUBLIC_UMBRA_RELAYER_URL ??
  "https://relayer.api.umbraprivacy.com";

export async function scanAndClaimUtxos(client: UmbraClient) {
  const zkProver = getClaimProver();
  const relayer = getUmbraRelayer({ apiEndpoint: RELAYER_URL });

  const scanner = getClaimableUtxoScannerFunction({ client });
  // endInsertionIndex=10000n is required — without it the scanner processes an empty range.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await scanner(0n as any, 0n as any, 10000n as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any;

  // publicReceived = UTXOs from getPublicBalanceToReceiverClaimableUtxoCreatorFunction (our send path)
  // received       = UTXOs from getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction
  const toClaimReceiver: unknown[] = [
    ...(Array.isArray(r.received) ? r.received : []),
    ...(Array.isArray(r.publicReceived) ? r.publicReceived : []),
  ];

  if (toClaimReceiver.length === 0) {
    return { claimed: 0 };
  }

  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    {
      zkProver,
      relayer,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchBatchMerkleProof: (client as any).fetchBatchMerkleProof,
    },
  );

  // Claim one at a time — a batch fails entirely if any single UTXO is already spent.
  let claimed = 0;
  for (const utxo of toClaimReceiver) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await claim([utxo as any]);
      claimed++;
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const isAlreadySpent = msg.includes("already") || msg.includes("processed");
      if (!isAlreadySpent) throw e;
    }
  }

  return { claimed };
}
