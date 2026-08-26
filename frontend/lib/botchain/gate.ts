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
 * Solana is the default and the fallback for everything: an unset value, a corrupted one, and —
 * the case that matters — a stored `botchain` while the flag is off. Someone who selected BOT Chain
 * on a preview build and later loads a production build with the flag off must land on Solana, not
 * on a half-enabled state where the pages render a BOT Chain view the wallet control cannot serve.
 */
export function resolveActiveChain(
  stored: string | null | undefined,
  enabled: boolean = BOTCHAIN_ENABLED,
): ActiveChain {
  if (stored === "botchain" && enabled) return "botchain";
  return "solana";
}

/** Whether a requested selection is allowed. Guards the setter as well as the initial read. */
export function canSelectChain(chain: ActiveChain, enabled: boolean = BOTCHAIN_ENABLED): boolean {
  return chain === "solana" || enabled;
}
