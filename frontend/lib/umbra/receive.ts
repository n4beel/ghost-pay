import {
  getClaimableUtxoScannerFunction,
  getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
} from "@umbra-privacy/sdk";
import type { U32 } from "@umbra-privacy/sdk/types";
import type { UmbraClient } from "./client";
import { getClaimProver } from "./prover";

export async function scanAndClaimUtxos(client: UmbraClient) {
  const zkProver = getClaimProver();

  const scanner = getClaimableUtxoScannerFunction({ client });
  const { received } = await scanner(
    0n as unknown as U32,
    0n as unknown as U32,
  );

  if (received.length === 0) return { claimed: 0 };

  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    // zkProver type is compatible at runtime — cast needed due to strict branded types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { zkProver } as any,
  );

  await claim(received);

  return { claimed: received.length };
}
