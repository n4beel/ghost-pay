import { getUserAccountQuerierFunction } from "@umbra-privacy/sdk";
import type { UmbraClient } from "./client";

export async function issueComplianceGrant(
  client: UmbraClient,
  granteeWalletAddress: string,
): Promise<void> {
  const { address } = await import("@solana/kit");
  const querier = getUserAccountQuerierFunction({ client });
  const granteeAccount = await querier(address(granteeWalletAddress));
  if (!granteeAccount) {
    throw new Error("Grantee is not registered with Umbra");
  }
  // Full grant issuance requires grantee X25519 key exchange — coming in Phase 3
  throw new Error("Compliance grant issuance coming in Phase 3");
}

export async function revokeComplianceGrant(
  _client: UmbraClient,
  _granteePublicKey: string,
): Promise<void> {
  throw new Error("Grant revocation coming in Phase 3");
}
