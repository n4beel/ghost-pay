import {
  getComplianceGrantIssuerFunction,
  getComplianceGrantRevokerFunction,
  getUserAccountQuerierFunction,
  assertX25519PublicKey,
  assertRcEncryptionNonce,
} from "@umbra-privacy/sdk";
import { address } from "@solana/kit";
import type { UmbraClient } from "./client";

export interface StoredGrant {
  receiver: string;
  receiverX25519Bytes: number[];
  granterX25519Bytes: number[];
  nonce: string;
  issuedAt: number;
}

const grantsKey = (addr: string) => `umbra_compliance_grants_${addr}`;

export function loadStoredGrants(granterAddress: string): StoredGrant[] {
  try {
    const raw = localStorage.getItem(grantsKey(granterAddress));
    return raw ? (JSON.parse(raw) as StoredGrant[]) : [];
  } catch {
    return [];
  }
}

function saveGrant(granterAddress: string, grant: StoredGrant): void {
  const grants = loadStoredGrants(granterAddress);
  grants.push(grant);
  localStorage.setItem(grantsKey(granterAddress), JSON.stringify(grants));
}

function deleteStoredGrant(granterAddress: string, receiver: string, nonce: string): void {
  const grants = loadStoredGrants(granterAddress).filter(
    (g) => !(g.receiver === receiver && g.nonce === nonce),
  );
  localStorage.setItem(grantsKey(granterAddress), JSON.stringify(grants));
}

async function fetchX25519(client: UmbraClient, walletAddress: string) {
  const querier = getUserAccountQuerierFunction({ client });
  const result = await querier(address(walletAddress));
  if (result?.state !== "exists") {
    throw new Error(`${walletAddress} is not registered with Umbra`);
  }
  return result.data.x25519PublicKey;
}

export async function issueComplianceGrant(
  client: UmbraClient,
  granteeWalletAddress: string,
): Promise<void> {
  const [granterX25519, receiverX25519] = await Promise.all([
    fetchX25519(client, client.signer.address),
    fetchX25519(client, granteeWalletAddress),
  ]);

  const nonce = BigInt(Date.now());
  assertRcEncryptionNonce(nonce);
  const issuer = getComplianceGrantIssuerFunction({ client });
  await issuer(address(granteeWalletAddress), granterX25519, receiverX25519, nonce);

  saveGrant(client.signer.address, {
    receiver: granteeWalletAddress,
    receiverX25519Bytes: Array.from(receiverX25519),
    granterX25519Bytes: Array.from(granterX25519),
    nonce: nonce.toString(),
    issuedAt: Date.now(),
  });
}

export async function revokeStoredGrant(
  client: UmbraClient,
  grant: StoredGrant,
): Promise<void> {
  const granterX25519 = new Uint8Array(grant.granterX25519Bytes);
  const receiverX25519 = new Uint8Array(grant.receiverX25519Bytes);
  assertX25519PublicKey(granterX25519);
  assertX25519PublicKey(receiverX25519);

  const nonce = BigInt(grant.nonce);
  assertRcEncryptionNonce(nonce);
  const revoker = getComplianceGrantRevokerFunction({ client });
  await revoker(address(grant.receiver), granterX25519, receiverX25519, nonce);

  deleteStoredGrant(client.signer.address, grant.receiver, grant.nonce);
}
