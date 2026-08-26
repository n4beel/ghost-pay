import type { Address, Hex, PublicClient } from "viem";
import { announcerAbi, getDeployment } from "../botchain/contracts";
import type { BotChainId } from "../botchain/chain";
import {
  SCHEME_ID,
  decodePrivateKey,
  decodePublicKey,
  hashSharedSecret,
  sharedSecret,
  stealthPublicKey,
  toAddress,
  viewTagOf,
} from "./crypto";
import { amountFromMetadata, viewTagFromMetadata } from "./generate";
import type { ViewingKeys } from "./keys";

/**
 * Recipient side: find the announcements that belong to us.
 *
 * There is no index and no server. The recipient reads every `Announcement` the chain has ever
 * emitted and tests each one locally, which is exactly why nothing observable distinguishes a
 * recipient reading their own payment from anyone else reading the same logs.
 *
 * The view tag is what makes that affordable. Testing an announcement fully costs two point
 * multiplications, a point addition and two hashes; testing the view tag costs one multiplication
 * and one hash, and eliminates 255 of every 256 announcements that are not ours.
 */

export type Announcement = {
  schemeId: bigint;
  stealthAddress: Address;
  caller: Address;
  ephemeralPubKey: Hex;
  metadata: Hex;
  blockNumber: bigint;
  transactionHash: Hex;
  logIndex: number;
};

export type StealthMatch = Announcement & {
  /** View tag as announced, already confirmed against our own derivation. */
  viewTag: Hex;
  /** Amount from the metadata, or null when the sender used a different metadata layout. */
  amount: bigint | null;
};

/**
 * The recipient's side of the scan, decoded once.
 *
 * Hoisting this out of the per-announcement path is not only about the work saved over a hundred
 * thousand logs. It is where bad *keys* have to fail: a scan that swallowed an invalid viewing key
 * along with the malformed announcements would return zero matches and look exactly like a user who
 * has never been paid.
 */
type ViewingContext = {
  viewingScalar: bigint;
  spendingPoint: ReturnType<typeof decodePublicKey>;
};

function prepareViewingContext(keys: ViewingKeys): ViewingContext {
  return {
    viewingScalar: decodePrivateKey(keys.viewingPrivateKey, "viewing private key"),
    spendingPoint: decodePublicKey(keys.spendingPublicKey, "spending public key"),
  };
}

/**
 * Test one announcement against a prepared context.
 *
 * Returns null for anything that is not ours, including announcements that are malformed. This part
 * is deliberately total: announcements are written by anyone who can pay gas, ERC-5564 names spam as
 * a known attack, and a scan that throws on the first junk entry finds none of the real payments
 * behind it.
 */
function checkWithContext(
  announcement: Announcement,
  context: ViewingContext,
): StealthMatch | null {
  if (announcement.schemeId !== SCHEME_ID) return null;

  try {
    const announcedViewTag = viewTagFromMetadata(announcement.metadata);
    const ephemeralPoint = decodePublicKey(
      announcement.ephemeralPubKey,
      "ephemeral public key",
    );

    const hashed = hashSharedSecret(sharedSecret(context.viewingScalar, ephemeralPoint));

    // Stage one. Cheap, and wrong 255 times out of 256 for announcements that are not ours.
    if (viewTagOf(hashed) !== announcedViewTag.toLowerCase()) return null;

    // Stage two. The view tag matched, so derive properly and confirm.
    const derived = toAddress(stealthPublicKey(context.spendingPoint, hashed));
    if (derived.toLowerCase() !== announcement.stealthAddress.toLowerCase()) return null;

    return {
      ...announcement,
      viewTag: announcedViewTag,
      amount: amountFromMetadata(announcement.metadata),
    };
  } catch {
    return null;
  }
}

/**
 * Test one announcement against a recipient's viewing key.
 *
 * Throws on invalid keys, returns null on an announcement that is not ours or is malformed.
 */
export function checkAnnouncement(
  announcement: Announcement,
  keys: ViewingKeys,
): StealthMatch | null {
  return checkWithContext(announcement, prepareViewingContext(keys));
}

/** Filter a batch of announcements down to ours. */
export function checkAnnouncements(
  announcements: readonly Announcement[],
  keys: ViewingKeys,
): StealthMatch[] {
  const context = prepareViewingContext(keys);
  const matches: StealthMatch[] = [];
  for (const announcement of announcements) {
    const match = checkWithContext(announcement, context);
    if (match) matches.push(match);
  }
  return matches;
}

/**
 * Blocks per `eth_getLogs` call.
 *
 * Public RPCs cap this and disagree about where. BOT Chain's ~0.75s blocks mean a day is roughly
 * 115k blocks, so this is a few minutes of history per request. {@link fetchAnnouncements} halves
 * the window on failure, so a node with a tighter cap costs retries, not a broken scan.
 */
export const DEFAULT_BLOCK_RANGE = 5_000n;
const MIN_BLOCK_RANGE = 100n;

export type FetchAnnouncementsParams = {
  client: PublicClient;
  /** The ERC-5564 announcer. */
  announcer: Address;
  /** Defaults to the announcer's deploy block — starting at genesis reads twenty million empty blocks. */
  fromBlock: bigint;
  /** Defaults to the current head. */
  toBlock?: bigint;
  blockRange?: bigint;
  /** Called after each chunk, for a progress bar over a long history scan. */
  onProgress?: (scannedTo: bigint, head: bigint) => void;
  /** Called with each chunk's announcements, so a UI can show matches before the scan finishes. */
  onBatch?: (batch: Announcement[]) => void;
};

/**
 * Read every `Announcement` in a block range, in chunks the RPC will accept.
 *
 * On a failed chunk the range halves and retries, down to {@link MIN_BLOCK_RANGE}. Below that the
 * error is real and gets thrown: silently skipping a range would mean silently missing payments.
 */
export async function fetchAnnouncements({
  client,
  announcer,
  fromBlock,
  toBlock,
  blockRange = DEFAULT_BLOCK_RANGE,
  onProgress,
  onBatch,
}: FetchAnnouncementsParams): Promise<Announcement[]> {
  const head = toBlock ?? (await client.getBlockNumber());
  const announcements: Announcement[] = [];

  let cursor = fromBlock;
  let range = blockRange;

  while (cursor <= head) {
    const chunkEnd = cursor + range - 1n > head ? head : cursor + range - 1n;
    let logs;
    try {
      logs = await client.getLogs({
        address: announcer,
        event: announcerAbi[0],
        args: { schemeId: SCHEME_ID },
        fromBlock: cursor,
        toBlock: chunkEnd,
      });
    } catch (error) {
      if (range > MIN_BLOCK_RANGE) {
        range = range / 2n > MIN_BLOCK_RANGE ? range / 2n : MIN_BLOCK_RANGE;
        continue;
      }
      throw error;
    }

    const batch = logs.flatMap((log) => {
      const parsed = toAnnouncement(log);
      return parsed ? [parsed] : [];
    });
    announcements.push(...batch);
    onBatch?.(batch);

    cursor = chunkEnd + 1n;
    onProgress?.(chunkEnd, head);
  }

  return announcements;
}

/** Shape a viem log into an {@link Announcement}, dropping anything the node returned incomplete. */
function toAnnouncement(log: {
  args: Partial<{
    schemeId: bigint;
    stealthAddress: Address;
    caller: Address;
    ephemeralPubKey: Hex;
    metadata: Hex;
  }>;
  blockNumber: bigint | null;
  transactionHash: Hex | null;
  logIndex: number | null;
}): Announcement | null {
  const { schemeId, stealthAddress, caller, ephemeralPubKey, metadata } = log.args;
  if (
    schemeId === undefined ||
    stealthAddress === undefined ||
    caller === undefined ||
    ephemeralPubKey === undefined ||
    metadata === undefined ||
    log.blockNumber === null ||
    log.transactionHash === null ||
    log.logIndex === null
  ) {
    // Pending logs have null block fields. They are not missed — the next confirmed scan or the
    // live watcher picks them up once mined.
    return null;
  }
  return {
    schemeId,
    stealthAddress,
    caller,
    ephemeralPubKey,
    metadata,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
  };
}

export type ScanParams = Omit<FetchAnnouncementsParams, "onBatch"> & {
  keys: ViewingKeys;
  /** Called as soon as a chunk yields matches, so payments appear during a long scan. */
  onMatch?: (matches: StealthMatch[]) => void;
};

/** Read history and return only the announcements that belong to `keys`. */
export async function scanForPayments({
  keys,
  onMatch,
  ...fetchParams
}: ScanParams): Promise<StealthMatch[]> {
  // Up front, before spending a single RPC call on a key set that cannot match anything.
  const context = prepareViewingContext(keys);

  const matches: StealthMatch[] = [];
  await fetchAnnouncements({
    ...fetchParams,
    onBatch: (batch) => {
      const found: StealthMatch[] = [];
      for (const announcement of batch) {
        const match = checkWithContext(announcement, context);
        if (match) found.push(match);
      }
      if (found.length > 0) {
        matches.push(...found);
        onMatch?.(found);
      }
    },
  });
  return matches;
}

/** Where a history scan should start on a given chain. */
export function scanStartBlock(chainId: BotChainId): bigint {
  return getDeployment(chainId).deployBlock;
}

export type WatchParams = {
  client: PublicClient;
  announcer: Address;
  keys: ViewingKeys;
  onMatch: (match: StealthMatch) => void;
  onError?: (error: Error) => void;
};

/**
 * Subscribe to new announcements and report the ones that are ours.
 *
 * Uses `eth_subscribe` when the transport is a WebSocket and falls back to polling otherwise, which
 * viem decides internally. Returns the unsubscribe function.
 */
export function watchAnnouncements({
  client,
  announcer,
  keys,
  onMatch,
  onError,
}: WatchParams): () => void {
  // Before subscribing, so bad keys surface as a thrown error the caller can show rather than as a
  // watcher that runs forever and never reports anything.
  const context = prepareViewingContext(keys);

  return client.watchEvent({
    address: announcer,
    event: announcerAbi[0],
    args: { schemeId: SCHEME_ID },
    onLogs: (logs) => {
      for (const log of logs) {
        const announcement = toAnnouncement(log);
        if (!announcement) continue;
        const match = checkWithContext(announcement, context);
        if (match) onMatch(match);
      }
    },
    onError,
  });
}
