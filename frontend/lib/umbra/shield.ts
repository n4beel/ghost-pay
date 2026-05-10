import { getPublicBalanceToEncryptedBalanceDirectDepositorFunction } from "@umbra-privacy/sdk";
import type { U64 } from "@umbra-privacy/sdk/types";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";

export async function shieldTokens(
  client: UmbraClient,
  mintAddress: string,
  amountLamports: bigint,
) {
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  return deposit(
    client.signer.address,
    address(mintAddress),
    amountLamports as U64,
  );
}
