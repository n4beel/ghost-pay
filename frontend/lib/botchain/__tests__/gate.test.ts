import { describe, expect, it } from "vitest";
import { DEFAULT_CHAIN, canSelectChain, resolveActiveChain } from "../gate";

/**
 * The rule that keeps an unreleased chain out of production. Worth a test of its own: the failure
 * is not a crash, it is a live app quietly showing a half-built second chain to real users.
 */

describe("resolveActiveChain", () => {
  it("honours a stored selection when the flag is on", () => {
    expect(resolveActiveChain("botchain", true)).toBe("botchain");
    expect(resolveActiveChain("solana", true)).toBe("solana");
  });

  it("forces Solana when the flag is off, whatever was stored", () => {
    // The case this exists for: someone selects BOT Chain on a preview build, then loads production
    // with the flag off. Without this they get pages rendering a BOT Chain view behind a Solana
    // wallet control — a state neither chain works in.
    expect(resolveActiveChain("botchain", false)).toBe("solana");
    for (const stored of [null, undefined, "", "ethereum", "BOTCHAIN", "{}"]) {
      expect(resolveActiveChain(stored, false)).toBe("solana");
    }
  });

  it("opens on BOT Chain when the flag is on and nothing usable was stored", () => {
    // Where the flag is on, BOT Chain is what the build exists for. Anything that is not the
    // explicit string the switcher writes for Solana lands on BOT Chain.
    for (const stored of [null, undefined, "", "ethereum", "BOTCHAIN", "SOLANA", "{}"]) {
      expect(resolveActiveChain(stored, true)).toBe("botchain");
    }
  });
});

describe("DEFAULT_CHAIN", () => {
  it("matches what an empty store resolves to under this build's flag", () => {
    // The provider seeds its first render from this, so a drift between the two would show up as a
    // hydration mismatch rather than as a wrong default.
    expect(DEFAULT_CHAIN).toBe(resolveActiveChain(null));
  });
});

describe("canSelectChain", () => {
  it("always allows Solana", () => {
    expect(canSelectChain("solana", false)).toBe(true);
    expect(canSelectChain("solana", true)).toBe(true);
  });

  it("allows BOT Chain only when the flag is on", () => {
    expect(canSelectChain("botchain", true)).toBe(true);
    expect(canSelectChain("botchain", false)).toBe(false);
  });
});
