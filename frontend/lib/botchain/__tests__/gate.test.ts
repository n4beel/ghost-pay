import { describe, expect, it } from "vitest";
import { canSelectChain, resolveActiveChain } from "../gate";

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
  });

  it("defaults to Solana for anything unrecognised", () => {
    for (const stored of [null, undefined, "", "ethereum", "BOTCHAIN", "{}"]) {
      expect(resolveActiveChain(stored, true)).toBe("solana");
    }
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
