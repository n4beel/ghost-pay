/**
 * The master switch for the whole BOT Chain path.
 *
 * Ghost Pay is live. The second chain stays completely invisible in production until the whole
 * flow is verified end to end, which means the flag has to be the *only* thing that decides —
 * not a hidden switcher plus a persisted preference that still routes pages to a BOT Chain view.
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` for statically written property accesses. This
 * one is spelled out on purpose; a dynamic lookup reads as undefined in the browser and would turn
 * the flag permanently off, which fails safe but silently.
 */
export const BOTCHAIN_ENABLED = process.env.NEXT_PUBLIC_BOTCHAIN_ENABLED === "true";

export type ActiveChain = "solana" | "botchain";

export const CHAIN_STORAGE_KEY = "ghost-pay:active-chain";

/**
 * Decide which chain the UI points at, given what was persisted and whether the flag is on.
 *
 * Extracted from the provider so the one rule that gates an unreleased chain in production is
 * covered by a test rather than by reading a component.
 *
 * Two rules, in this order:
 *
 * 1. Flag off — Solana, whatever was stored. This is the one that matters in production. Someone
 *    who selected BOT Chain on a preview build and later loads a production build with the flag
 *    off must land on Solana, not on a half-enabled state where the pages render a BOT Chain view
 *    the wallet control cannot serve.
 * 2. Flag on — BOT Chain unless Solana was explicitly chosen. Where the flag is on, BOT Chain is
 *    what the build is for, so an unset or unrecognised value opens on it. Only a stored
 *    `"solana"` — which the provider writes solely when the user picks Solana in the switcher —
 *    overrides that, so a deliberate choice still survives a reload.
 */
export function resolveActiveChain(
  stored: string | null | undefined,
  enabled: boolean = BOTCHAIN_ENABLED,
): ActiveChain {
  if (!enabled) return "solana";
  return stored === "solana" ? "solana" : "botchain";
}

/** The chain a first-time visitor lands on. Depends only on the build-time flag. */
export const DEFAULT_CHAIN: ActiveChain = resolveActiveChain(null);

/** Whether a requested selection is allowed. Guards the setter as well as the initial read. */
export function canSelectChain(chain: ActiveChain, enabled: boolean = BOTCHAIN_ENABLED): boolean {
  return chain === "solana" || enabled;
}
