import type { Address } from "viem";
import { botChain, bohrTestnet, type BotChainId } from "./chain";

/**
 * Deployed contract addresses, keyed by chain ID.
 *
 * ERC-5564 and ERC-6538 are deployed at identical canonical addresses on Ethereum, Arbitrum, Base,
 * Optimism, Polygon, Gnosis and Scroll. They are not on BOT Chain, so Ghost Pay deploys its own.
 * Testnet and mainnet addresses will not match, hence the per-chain map rather than one constant.
 *
 * Populate from the output of `contracts/script/Deploy.s.sol`.
 */

type Deployment = {
  announcer: Address;
  registry: Address;
  stealthSend: Address;
  /**
   * Block the announcer was deployed at. The scanner starts here rather than at genesis, which is
   * the difference between reading a few thousand blocks and twenty million.
   */
  deployBlock: bigint;
};

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/**
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only for statically written property
 * accesses. A dynamic lookup like `process.env[name]` is not replaced and reads as undefined in the
 * browser, so every variable below is spelled out literally on purpose. Do not refactor these into
 * a loop.
 */
function addr(value: string | undefined): Address {
  return (value as Address) ?? ZERO;
}

export const DEPLOYMENTS: Record<BotChainId, Deployment> = {
  [botChain.id]: {
    announcer: addr(process.env.NEXT_PUBLIC_ANNOUNCER_677),
    registry: addr(process.env.NEXT_PUBLIC_REGISTRY_677),
    stealthSend: addr(process.env.NEXT_PUBLIC_STEALTH_SEND_677),
    deployBlock: BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK_677 ?? "0"),
  },
  [bohrTestnet.id]: {
    announcer: addr(process.env.NEXT_PUBLIC_ANNOUNCER_968),
    registry: addr(process.env.NEXT_PUBLIC_REGISTRY_968),
    stealthSend: addr(process.env.NEXT_PUBLIC_STEALTH_SEND_968),
    deployBlock: BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK_968 ?? "0"),
  },
};

export function getDeployment(chainId: BotChainId): Deployment {
  return DEPLOYMENTS[chainId];
}

/**
 * True when this chain's deployment is fully configured. Gate the UI on this.
 *
 * The deploy block counts. Without it the announcement scanner has no start point, and walking a
 * chain with ~0.75s blocks from genesis is not a slow scan, it is a hung tab — so a deployment
 * missing its block is not usable and must not present as ready.
 */
export function isDeployed(chainId: BotChainId): boolean {
  const d = DEPLOYMENTS[chainId];
  return (
    d.announcer !== ZERO &&
    d.registry !== ZERO &&
    d.stealthSend !== ZERO &&
    d.deployBlock > 0n
  );
}

/** Scheme ID 1 is secp256k1, per ERC-5564. */
export const SCHEME_ID = 1n;

export const announcerAbi = [
  {
    type: "event",
    name: "Announcement",
    inputs: [
      { name: "schemeId", type: "uint256", indexed: true },
      { name: "stealthAddress", type: "address", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "ephemeralPubKey", type: "bytes", indexed: false },
      { name: "metadata", type: "bytes", indexed: false },
    ],
  },
  {
    type: "function",
    name: "announce",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemeId", type: "uint256" },
      { name: "stealthAddress", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export const registryAbi = [
  {
    type: "event",
    name: "StealthMetaAddressSet",
    inputs: [
      { name: "registrant", type: "address", indexed: true },
      { name: "schemeId", type: "uint256", indexed: true },
      { name: "stealthMetaAddress", type: "bytes", indexed: false },
    ],
  },
  {
    type: "function",
    name: "registerKeys",
    stateMutability: "nonpayable",
    inputs: [
      { name: "schemeId", type: "uint256" },
      { name: "stealthMetaAddress", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "stealthMetaAddressOf",
    stateMutability: "view",
    inputs: [
      { name: "registrant", type: "address" },
      { name: "schemeId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    type: "function",
    name: "nonceOf",
    stateMutability: "view",
    inputs: [{ name: "registrant", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const stealthSendAbi = [
  {
    type: "event",
    name: "StealthPaymentSent",
    inputs: [
      { name: "stealthAddress", type: "address", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "send",
    stateMutability: "payable",
    inputs: [
      { name: "stealthAddress", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;
