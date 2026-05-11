import { getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction } from "@umbra-privacy/sdk";
import { getCreateReceiverClaimableUtxoFromEncryptedBalanceProver } from "@umbra-privacy/web-zk-prover";
import type { U64 } from "@umbra-privacy/sdk/types";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";

let vaultSendProver: ReturnType<typeof getCreateReceiverClaimableUtxoFromEncryptedBalanceProver> | null = null;

function getVaultSendProver() {
  if (!vaultSendProver) {
    vaultSendProver = getCreateReceiverClaimableUtxoFromEncryptedBalanceProver();
  }
  return vaultSendProver;
}

export async function sendFromVault(
  client: UmbraClient,
  receiverAddress: string,
  mintAddress: string,
  amountLamports: bigint,
) {
  const createUtxo = getEncryptedBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver: getVaultSendProver() },
  );
  return createUtxo({
    amount: amountLamports as U64,
    destinationAddress: address(receiverAddress),
    mint: address(mintAddress),
  });
}
