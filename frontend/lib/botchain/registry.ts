import type { Address, Hex, PublicClient } from "viem";
import { SCHEME_ID, getDeployment, registryAbi } from "./contracts";
import type { BotChainId } from "./chain";
import { decodeMetaAddress, type StealthMetaAddress } from "@/lib/stealth";

/**
 * ERC-6538: the public directory that maps an ordinary address to its stealth meta-address.
 *
 * Publishing here is what makes a stealth payment possible without prior contact — a sender looks
 * up an address they already know and gets the keys they need. Registration is a one-time public
 * act. It reveals that an address is willing to receive stealth payments; it reveals nothing about
 * any payment, and the meta-address cannot be linked to the stealth addresses derived from it.
 */

/** No registration. `stealthMetaAddressOf` returns empty bytes rather than reverting. */
const EMPTY = "0x";

/**
 * Look up a registrant's published meta-address.
 *
 * Returns null when they have not registered, and also when they have registered something that is
 * not a valid scheme-1 meta-address. The registry accepts arbitrary bytes — it is a mapping, not a
 * validator — so anything read out of it is untrusted input until it decodes.
 */
export async function readMetaAddress(
  client: PublicClient,
  chainId: BotChainId,
  registrant: Address,
): Promise<StealthMetaAddress | null> {
  const raw = (await client.readContract({
    address: getDeployment(chainId).registry,
    abi: registryAbi,
    functionName: "stealthMetaAddressOf",
    args: [registrant, SCHEME_ID],
  })) as Hex;

  if (!raw || raw === EMPTY) return null;

  try {
    decodeMetaAddress(raw);
    return raw;
  } catch {
    return null;
  }
}

/**
 * The `registerKeys` call, shaped for wagmi's `useWriteContract`.
 *
 * Validates the meta-address before handing it over. Registering malformed bytes costs gas and
 * publishes a directory entry that makes every sender fail.
 */
export function registerKeysCall(chainId: BotChainId, metaAddress: StealthMetaAddress) {
  decodeMetaAddress(metaAddress);
  return {
    address: getDeployment(chainId).registry,
    abi: registryAbi,
    functionName: "registerKeys",
    args: [SCHEME_ID, metaAddress],
  } as const;
}
