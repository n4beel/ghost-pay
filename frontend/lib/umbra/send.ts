import { getPublicBalanceToReceiverClaimableUtxoCreatorFunction } from "@umbra-privacy/sdk";
import type { U64 } from "@umbra-privacy/sdk/types";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";
import { getCreateProver } from "./prover";

export async function sendPrivate(
  client: UmbraClient,
  receiverAddress: string,
  mintAddress: string,
  amountLamports: bigint,
) {
  const zkProver = getCreateProver();
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver },
  );
  return createUtxo({
    amount: amountLamports as U64,
    destinationAddress: address(receiverAddress),
    mint: address(mintAddress),
  });
}
