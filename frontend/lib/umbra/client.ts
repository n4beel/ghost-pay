import { getUmbraClient } from "@umbra-privacy/sdk";
import { createSignerFromWalletAccount } from "@umbra-privacy/sdk";

export type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;
export type UmbraSigner = ReturnType<typeof createSignerFromWalletAccount>;

const NETWORK = (process.env.NEXT_PUBLIC_UMBRA_NETWORK ?? "mainnet") as
  | "mainnet"
  | "devnet"
  | "localnet";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_ENDPOINT!;
const RPC_WS_URL = process.env.NEXT_PUBLIC_RPC_WS_ENDPOINT!;
const INDEXER_URL = process.env.NEXT_PUBLIC_UMBRA_INDEXER_URL!;

export async function initUmbraClient(signer: UmbraSigner): Promise<UmbraClient> {
  return getUmbraClient({
    signer,
    network: NETWORK,
    rpcUrl: RPC_URL,
    rpcSubscriptionsUrl: RPC_WS_URL,
    indexerApiEndpoint: INDEXER_URL,
    deferMasterSeedSignature: true,
  });
}
