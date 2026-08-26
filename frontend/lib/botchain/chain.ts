import { defineChain } from "viem";

/**
 * BOT Chain network definitions.
 *
 * Parameters confirmed from the BOT Chain developer docs and ChainList. Decimals are the EVM
 * default of 18; nothing in the docs states otherwise, but it is worth confirming against a real
 * balance before mainnet launch.
 *
 * The testnet is branded "Bohr" and lives on its own domain, which reads as an unrelated project
 * until you know. It is BOT Chain's testnet.
 */

const MAINNET_RPC =
  process.env.NEXT_PUBLIC_BOTCHAIN_RPC ?? "https://rpc.botchain.ai";
const MAINNET_WS =
  process.env.NEXT_PUBLIC_BOTCHAIN_WS ?? "wss://ws-rpc.botchain.ai";
const TESTNET_RPC = process.env.NEXT_PUBLIC_BOHR_RPC ?? "https://rpc.bohr.life";

export const botChain = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [MAINNET_RPC], webSocket: [MAINNET_WS] },
  },
  blockExplorers: {
    default: { name: "BotScan", url: "https://scan.botchain.ai" },
  },
});

export const bohrTestnet = defineChain({
  id: 968,
  name: "Bohr Testnet",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: {
    default: { http: [TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: "Bohr Scan", url: "https://scan.bohr.life" },
  },
  testnet: true,
});

/**
 * Which BOT Chain network the app targets. Development runs against Bohr; the listing requirement
 * is satisfied on mainnet, so production must be 677.
 */
export const activeBotChain =
  process.env.NEXT_PUBLIC_BOTCHAIN_NETWORK === "mainnet" ? botChain : bohrTestnet;

export const BOT_CHAINS = [botChain, bohrTestnet] as const;

export type BotChainId = (typeof BOT_CHAINS)[number]["id"];

export function isBotChainId(id: number | undefined): id is BotChainId {
  return id === botChain.id || id === bohrTestnet.id;
}

/** Explorer link for a transaction hash on whichever BOT Chain network it happened on. */
export function txUrl(chainId: number, hash: string): string {
  const chain = chainId === botChain.id ? botChain : bohrTestnet;
  return `${chain.blockExplorers.default.url}/tx/${hash}`;
}

/** Explorer link for an address. */
export function addressUrl(chainId: number, address: string): string {
  const chain = chainId === botChain.id ? botChain : bohrTestnet;
  return `${chain.blockExplorers.default.url}/address/${address}`;
}

/** Where a user with no BOT is sent to get some. */
export function faucetUrl(chainId: number): string | null {
  return chainId === bohrTestnet.id ? "https://faucet.botchain.ai/basic" : null;
}
