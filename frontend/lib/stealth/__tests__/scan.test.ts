import { describe, expect, it, vi } from "vitest";
import type { Address, Hex, PublicClient } from "viem";
import { StealthError, publicKeyOf, randomPrivateKey } from "../crypto";
import { encodeMetaAddress, toViewingKeys, type StealthKeys } from "../keys";
import { generateStealthAddress } from "../generate";
import {
  DEFAULT_BLOCK_RANGE,
  checkAnnouncement,
  checkAnnouncements,
  fetchAnnouncements,
  scanForPayments,
  watchAnnouncements,
  type Announcement,
} from "../scan";

const ANNOUNCER = "0x1111111111111111111111111111111111111111" as Address;
const SENDER = "0x2222222222222222222222222222222222222222" as Address;

function newRecipient(): StealthKeys {
  const spendingPrivateKey = randomPrivateKey();
  const viewingPrivateKey = randomPrivateKey();
  return {
    spendingPrivateKey,
    spendingPublicKey: publicKeyOf(spendingPrivateKey),
    viewingPrivateKey,
    viewingPublicKey: publicKeyOf(viewingPrivateKey),
  };
}

let nextLogIndex = 0;

function announce(keys: StealthKeys, amount = 10n ** 18n): Announcement {
  const payment = generateStealthAddress({
    metaAddress: encodeMetaAddress(keys),
    amount,
  });
  nextLogIndex += 1;
  return {
    schemeId: 1n,
    stealthAddress: payment.stealthAddress,
    caller: SENDER,
    ephemeralPubKey: payment.ephemeralPublicKey,
    metadata: payment.metadata,
    blockNumber: BigInt(1000 + nextLogIndex),
    transactionHash: `0x${nextLogIndex.toString(16).padStart(64, "0")}` as Hex,
    logIndex: nextLogIndex,
  };
}

describe("checkAnnouncement", () => {
  it("recognises a payment made to us", () => {
    const keys = newRecipient();
    const announcement = announce(keys, 42n);
    const match = checkAnnouncement(announcement, toViewingKeys(keys));

    expect(match).not.toBeNull();
    expect(match!.stealthAddress).toBe(announcement.stealthAddress);
    expect(match!.amount).toBe(42n);
    expect(match!.viewTag).toBe(announcement.metadata.slice(0, 4));
  });

  it("ignores payments made to someone else", () => {
    const us = newRecipient();
    const them = newRecipient();
    for (let i = 0; i < 64; i++) {
      expect(checkAnnouncement(announce(them), toViewingKeys(us))).toBeNull();
    }
  });

  it("needs the viewing key, not just the spending key", () => {
    // If a wrong viewing key still matched, the viewing key would not be what gates discovery and
    // handing one to a watch-only service would leak nothing useful — or worse, everything.
    const keys = newRecipient();
    const announcement = announce(keys);
    const wrongViewing = {
      spendingPublicKey: keys.spendingPublicKey,
      viewingPrivateKey: randomPrivateKey(),
    };
    expect(checkAnnouncement(announcement, wrongViewing)).toBeNull();
  });

  it("rejects a view tag that does not match, before deriving", () => {
    // Stage one of the filter. The address is genuinely ours; only the announced tag is wrong.
    const keys = newRecipient();
    const announcement = announce(keys);
    const realTag = announcement.metadata.slice(2, 4);
    const wrongTag = realTag === "00" ? "01" : "00";
    const tampered = {
      ...announcement,
      metadata: `0x${wrongTag}${announcement.metadata.slice(4)}` as Hex,
    };
    expect(checkAnnouncement(tampered, toViewingKeys(keys))).toBeNull();
  });

  it("rejects an address that does not match, after the view tag passes", () => {
    // Stage two. The tag is right, so the cheap filter lets it through and the full derivation has
    // to be what catches it.
    const keys = newRecipient();
    const announcement = announce(keys);
    const tampered = {
      ...announcement,
      stealthAddress: "0x3333333333333333333333333333333333333333" as Address,
    };
    expect(checkAnnouncement(tampered, toViewingKeys(keys))).toBeNull();
  });

  it("compares addresses case-insensitively", () => {
    // Nodes are inconsistent about returning checksummed addresses. A case-sensitive comparison
    // would make payments invisible on some RPCs and not others.
    const keys = newRecipient();
    const announcement = announce(keys);
    const lowercased = {
      ...announcement,
      stealthAddress: announcement.stealthAddress.toLowerCase() as Address,
    };
    expect(checkAnnouncement(lowercased, toViewingKeys(keys))).not.toBeNull();
  });

  it("ignores announcements for another scheme", () => {
    const keys = newRecipient();
    expect(checkAnnouncement({ ...announce(keys), schemeId: 2n }, toViewingKeys(keys))).toBeNull();
  });

  it("survives malformed announcements without throwing", () => {
    // Anyone who can pay gas can write an announcement, and ERC-5564 names spam as a known attack.
    // A scan that throws on the first junk entry finds none of the real payments behind it.
    const keys = newRecipient();
    const good = announce(keys);
    const junk: Announcement[] = [
      { ...good, ephemeralPubKey: "0x" },
      { ...good, ephemeralPubKey: "0xdeadbeef" },
      { ...good, ephemeralPubKey: `0x04${"11".repeat(32)}` },
      { ...good, ephemeralPubKey: `0x02${"ff".repeat(32)}` },
      { ...good, metadata: "0x" },
      { ...good, metadata: "0xz" as Hex },
    ];
    for (const announcement of junk) {
      expect(() => checkAnnouncement(announcement, toViewingKeys(keys))).not.toThrow();
      expect(checkAnnouncement(announcement, toViewingKeys(keys))).toBeNull();
    }
  });

  it("reports a null amount for foreign metadata layouts rather than guessing", () => {
    const keys = newRecipient();
    const announcement = announce(keys);
    const shortMetadata = {
      ...announcement,
      metadata: announcement.metadata.slice(0, 4) as Hex,
    };
    const match = checkAnnouncement(shortMetadata, toViewingKeys(keys));
    expect(match).not.toBeNull();
    expect(match!.amount).toBeNull();
  });
});

describe("invalid keys", () => {
  // A scan that swallowed a bad key set alongside the malformed announcements would return zero
  // matches and be indistinguishable from a user who has simply never been paid. Every entry point
  // validates the keys before doing anything else.
  const keys = newRecipient();
  const badViewing = { spendingPublicKey: keys.spendingPublicKey, viewingPrivateKey: "0x00" as Hex };
  const badSpending = { spendingPublicKey: "0xdead" as Hex, viewingPrivateKey: keys.viewingPrivateKey };

  it("throws rather than reporting no matches", () => {
    const announcement = announce(keys);
    expect(() => checkAnnouncement(announcement, badViewing)).toThrow(StealthError);
    expect(() => checkAnnouncement(announcement, badSpending)).toThrow(StealthError);
    expect(() => checkAnnouncements([announcement], badViewing)).toThrow(StealthError);
  });

  it("rejects before spending a single RPC call", async () => {
    const { client, ranges } = fakeClient({ head: 10_000n });
    await expect(
      scanForPayments({ client, announcer: ANNOUNCER, fromBlock: 0n, keys: badViewing }),
    ).rejects.toThrow(StealthError);
    expect(ranges).toEqual([]);
  });

  it("rejects before subscribing", () => {
    const watchEvent = vi.fn();
    const client = { watchEvent } as unknown as PublicClient;
    expect(() =>
      watchAnnouncements({ client, announcer: ANNOUNCER, keys: badViewing, onMatch: vi.fn() }),
    ).toThrow(StealthError);
    expect(watchEvent).not.toHaveBeenCalled();
  });
});

describe("checkAnnouncements", () => {
  it("picks ours out of a crowd, in order", () => {
    const us = newRecipient();
    const them = newRecipient();
    const ours = [announce(us, 1n), announce(us, 2n)];
    const batch = [announce(them), ours[0], announce(them), announce(them), ours[1]];

    const matches = checkAnnouncements(batch, toViewingKeys(us));
    expect(matches.map((m) => m.amount)).toEqual([1n, 2n]);
  });
});

type LoggedRange = { fromBlock: bigint; toBlock: bigint };

function fakeClient({
  head,
  logsFor = () => [],
  failWhen = () => false,
}: {
  head: bigint;
  logsFor?: (range: LoggedRange) => unknown[];
  failWhen?: (range: LoggedRange) => boolean;
}) {
  const ranges: LoggedRange[] = [];
  const client = {
    getBlockNumber: async () => head,
    getLogs: async ({ fromBlock, toBlock }: LoggedRange) => {
      const range = { fromBlock, toBlock };
      if (failWhen(range)) throw new Error("query returned more than 10000 results");
      ranges.push(range);
      return logsFor(range);
    },
  } as unknown as PublicClient;
  return { client, ranges };
}

function fakeLog(announcement: Announcement) {
  return {
    args: {
      schemeId: announcement.schemeId,
      stealthAddress: announcement.stealthAddress,
      caller: announcement.caller,
      ephemeralPubKey: announcement.ephemeralPubKey,
      metadata: announcement.metadata,
    },
    blockNumber: announcement.blockNumber,
    transactionHash: announcement.transactionHash,
    logIndex: announcement.logIndex,
  };
}

describe("fetchAnnouncements", () => {
  it("covers the whole range with no gaps and no overlaps", () => {
    // A gap is a missed payment the user never learns about, and there is nothing in the UI that
    // would reveal it. Exact coverage is the property worth testing here.
    const { client, ranges } = fakeClient({ head: 10_000n });
    return fetchAnnouncements({
      client,
      announcer: ANNOUNCER,
      fromBlock: 0n,
      blockRange: 1_000n,
    }).then(() => {
      expect(ranges[0].fromBlock).toBe(0n);
      expect(ranges[ranges.length - 1].toBlock).toBe(10_000n);
      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i].fromBlock).toBe(ranges[i - 1].toBlock + 1n);
      }
    });
  });

  it("stops at the head rather than running past it", async () => {
    const { client, ranges } = fakeClient({ head: 1_500n });
    await fetchAnnouncements({
      client,
      announcer: ANNOUNCER,
      fromBlock: 1_000n,
      blockRange: 1_000n,
    });
    expect(ranges).toEqual([
      { fromBlock: 1_000n, toBlock: 1_500n },
    ]);
  });

  it("does nothing when the start block is past the head", async () => {
    const { client, ranges } = fakeClient({ head: 100n });
    expect(
      await fetchAnnouncements({ client, announcer: ANNOUNCER, fromBlock: 200n }),
    ).toEqual([]);
    expect(ranges).toEqual([]);
  });

  it("honours an explicit toBlock without asking for the head", async () => {
    const { client, ranges } = fakeClient({ head: 10n ** 9n });
    await fetchAnnouncements({
      client,
      announcer: ANNOUNCER,
      fromBlock: 0n,
      toBlock: 500n,
      blockRange: 1_000n,
    });
    expect(ranges).toEqual([{ fromBlock: 0n, toBlock: 500n }]);
  });

  it("halves the window when the node rejects the range", async () => {
    // Public RPCs cap eth_getLogs ranges and disagree about where. Backing off beats picking a
    // conservative constant and making every scan four times slower than it needs to be.
    let seenTooWide = 0;
    const { client, ranges } = fakeClient({
      head: 4_000n,
      failWhen: ({ fromBlock, toBlock }) => {
        if (toBlock - fromBlock + 1n > 1_000n) {
          seenTooWide += 1;
          return true;
        }
        return false;
      },
    });

    await fetchAnnouncements({
      client,
      announcer: ANNOUNCER,
      fromBlock: 0n,
      blockRange: 4_000n,
    });

    expect(seenTooWide).toBeGreaterThan(0);
    for (const range of ranges) {
      expect(range.toBlock - range.fromBlock + 1n).toBeLessThanOrEqual(1_000n);
    }
    expect(ranges[0].fromBlock).toBe(0n);
    expect(ranges[ranges.length - 1].toBlock).toBe(4_000n);
  });

  it("gives up rather than skipping blocks when the error is real", async () => {
    // Silently skipping a range would silently lose payments. Failing loudly is the only honest
    // option once the window cannot shrink any further.
    const { client } = fakeClient({ head: 10_000n, failWhen: () => true });
    await expect(
      fetchAnnouncements({ client, announcer: ANNOUNCER, fromBlock: 0n }),
    ).rejects.toThrow(/10000 results/);
  });

  it("drops pending logs that have no block yet", async () => {
    const keys = newRecipient();
    const pending = { ...fakeLog(announce(keys)), blockNumber: null, transactionHash: null };
    const { client } = fakeClient({
      head: 10n,
      logsFor: () => [fakeLog(announce(keys)), pending],
    });
    const announcements = await fetchAnnouncements({
      client,
      announcer: ANNOUNCER,
      fromBlock: 0n,
    });
    expect(announcements).toHaveLength(1);
  });

  it("reports progress and streams batches", async () => {
    const keys = newRecipient();
    const onProgress = vi.fn();
    const onBatch = vi.fn();
    const { client } = fakeClient({
      head: 3_000n,
      logsFor: () => [fakeLog(announce(keys))],
    });

    await fetchAnnouncements({
      client,
      announcer: ANNOUNCER,
      fromBlock: 0n,
      blockRange: 1_000n,
      onProgress,
      onBatch,
    });

    expect(onBatch).toHaveBeenCalledTimes(4);
    expect(onProgress).toHaveBeenLastCalledWith(3_000n, 3_000n);
  });

  it("defaults to a block range the RPC is likely to accept", () => {
    expect(DEFAULT_BLOCK_RANGE).toBeGreaterThan(0n);
    expect(DEFAULT_BLOCK_RANGE).toBeLessThanOrEqual(10_000n);
  });
});

describe("scanForPayments", () => {
  it("returns only our payments and reports them as they are found", async () => {
    const us = newRecipient();
    const them = newRecipient();
    const mine = announce(us, 7n);
    const { client } = fakeClient({
      head: 1_000n,
      logsFor: () => [fakeLog(announce(them)), fakeLog(mine), fakeLog(announce(them))],
    });

    const onMatch = vi.fn();
    const matches = await scanForPayments({
      client,
      announcer: ANNOUNCER,
      fromBlock: 0n,
      keys: toViewingKeys(us),
      onMatch,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].stealthAddress).toBe(mine.stealthAddress);
    expect(matches[0].amount).toBe(7n);
    expect(onMatch).toHaveBeenCalledTimes(1);
  });

  it("does not fire the callback when nothing is ours", async () => {
    const us = newRecipient();
    const them = newRecipient();
    const { client } = fakeClient({ head: 100n, logsFor: () => [fakeLog(announce(them))] });
    const onMatch = vi.fn();
    expect(
      await scanForPayments({
        client,
        announcer: ANNOUNCER,
        fromBlock: 0n,
        keys: toViewingKeys(us),
        onMatch,
      }),
    ).toEqual([]);
    expect(onMatch).not.toHaveBeenCalled();
  });
});

describe("watchAnnouncements", () => {
  it("passes matches to the callback and returns the unsubscribe", () => {
    const us = newRecipient();
    const them = newRecipient();
    const mine = announce(us, 3n);

    let deliver: ((logs: unknown[]) => void) | undefined;
    const unwatch = vi.fn();
    const client = {
      watchEvent: ({ onLogs }: { onLogs: (logs: unknown[]) => void }) => {
        deliver = onLogs;
        return unwatch;
      },
    } as unknown as PublicClient;

    const onMatch = vi.fn();
    const stop = watchAnnouncements({
      client,
      announcer: ANNOUNCER,
      keys: toViewingKeys(us),
      onMatch,
    });

    deliver!([fakeLog(announce(them)), fakeLog(mine)]);
    expect(onMatch).toHaveBeenCalledTimes(1);
    expect(onMatch.mock.calls[0][0].amount).toBe(3n);

    stop();
    expect(unwatch).toHaveBeenCalled();
  });
});
