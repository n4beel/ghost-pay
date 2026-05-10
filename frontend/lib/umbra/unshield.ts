import { getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction } from "@umbra-privacy/sdk";
import type { U64 } from "@umbra-privacy/sdk/types";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";

export async function unshieldTokens(
  client: UmbraClient,
  mintAddress: string,
  amountLamports: bigint,
  destinationAddress?: string,
) {
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
  const dest = destinationAddress ?? client.signer.address;
  return withdraw(
    address(dest),
    address(mintAddress),
    amountLamports as U64,
  );
}
