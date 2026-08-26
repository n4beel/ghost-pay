import { describe, expect, it, vi } from "vitest";
import type { Address, Hex, PublicClient } from "viem";
import { bohrTestnet } from "../chain";
import { readMetaAddress, registerKeysCall } from "../registry";
import { StealthError, deriveStealthKeys, encodeMetaAddress } from "@/lib/stealth";

const REGISTRANT = "0x1111111111111111111111111111111111111111" as Address;

const SIGNATURE =
  ("0x" +
    "b8f5e4f6ee5cae90cbc7a2cbe4a5f2b6d3d3f6ab1cf3e2d1b0a9988776655443" +
    "2f1e0d9c8b7a695847362514039281706f5e4d3c2b1a09f8e7d6c5b4a3928170" +
    "1b") as Hex;

const META_ADDRESS = encodeMetaAddress(deriveStealthKeys(SIGNATURE));

function clientReturning(value: unknown) {
  return { readContract: vi.fn(async () => value) } as unknown as PublicClient;
}

describe("readMetaAddress", () => {
  it("returns a registered meta-address", async () => {
    expect(await readMetaAddress(clientReturning(META_ADDRESS), bohrTestnet.id, REGISTRANT)).toBe(
      META_ADDRESS,
    );
  });

  it("returns null when nothing is registered", async () => {
    for (const empty of ["0x", "", undefined, null]) {
      expect(await readMetaAddress(clientReturning(empty), bohrTestnet.id, REGISTRANT)).toBeNull();
    }
  });

  it("returns null for registered bytes that are not a scheme-1 meta-address", async () => {
    // The registry is a mapping, not a validator: anyone can register arbitrary bytes against
    // themselves. Handing those to the sender path would derive an address nobody holds the key to.
    for (const junk of ["0xdeadbeef", `0x${"11".repeat(66)}`, `0x${"00".repeat(66)}`]) {
      expect(await readMetaAddress(clientReturning(junk), bohrTestnet.id, REGISTRANT)).toBeNull();
    }
  });

  it("queries scheme 1 against the configured registry", async () => {
    const client = clientReturning(META_ADDRESS);
    await readMetaAddress(client, bohrTestnet.id, REGISTRANT);
    const call = (client.readContract as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.functionName).toBe("stealthMetaAddressOf");
    expect(call.args).toEqual([REGISTRANT, 1n]);
  });
});

describe("registerKeysCall", () => {
  it("builds a scheme-1 registration", () => {
    const call = registerKeysCall(bohrTestnet.id, META_ADDRESS);
    expect(call.functionName).toBe("registerKeys");
    expect(call.args).toEqual([1n, META_ADDRESS]);
  });

  it("refuses to register malformed bytes", () => {
    // Costs gas and publishes a directory entry that makes every sender fail.
    expect(() => registerKeysCall(bohrTestnet.id, "0xdeadbeef")).toThrow(StealthError);
  });
});
