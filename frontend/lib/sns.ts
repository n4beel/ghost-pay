import { resolve, reverseLookup } from "@bonfida/spl-name-service";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_ENDPOINT!;

function getConnection() {
  return new Connection(RPC_URL, "confirmed");
}

export async function resolveSnsDomain(domain: string): Promise<string | null> {
  try {
    const name = domain.endsWith(".sol") ? domain.slice(0, -4) : domain;
    const connection = getConnection();
    const owner = await resolve(connection, name);
    return owner.toBase58();
  } catch {
    return null;
  }
}

export async function reverseResolveSns(address: string): Promise<string | null> {
  try {
    const connection = getConnection();
    const pubkey = new PublicKey(address);
    const domainName = await reverseLookup(connection, pubkey);
    return `${domainName}.sol`;
  } catch {
    return null;
  }
}

export function isSolDomain(input: string): boolean {
  return input.trim().endsWith(".sol") || /^[a-zA-Z0-9-]+$/.test(input.trim());
}
