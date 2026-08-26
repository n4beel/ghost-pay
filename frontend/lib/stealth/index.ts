/**
 * ERC-5564 stealth addresses over secp256k1, for BOT Chain.
 *
 * Read `DOCUMENTATION/BOTCHAIN.md` before changing anything here. The byte-level conventions in
 * `crypto.ts` are pinned against the reference implementation by `__tests__/reference.test.ts`; a
 * change that breaks interoperability will not show up as a failed send, it will show up as funds
 * at an address nobody holds the key to.
 */

export {
  CURVE_ORDER,
  SCHEME_ID,
  StealthError,
  publicKeyOf,
  randomPrivateKey,
} from "./crypto";

export {
  META_ADDRESS_BYTES,
  META_ADDRESS_CHAIN_LABEL,
  STEALTH_KEY_MESSAGE,
  assertDeterministicDerivation,
  decodeMetaAddress,
  deriveStealthKeys,
  encodeMetaAddress,
  isValidMetaAddress,
  metaAddressFingerprint,
  parseMetaAddressUri,
  toMetaAddressUri,
  toViewingKeys,
  type StealthKeys,
  type StealthMetaAddress,
  type ViewingKeys,
} from "./keys";

export {
  METADATA_BYTES,
  amountFromMetadata,
  buildNativeMetadata,
  generateStealthAddress,
  viewTagFromMetadata,
  type GenerateStealthAddressParams,
  type StealthPayment,
} from "./generate";

export {
  DEFAULT_BLOCK_RANGE,
  checkAnnouncement,
  checkAnnouncements,
  fetchAnnouncements,
  scanForPayments,
  scanStartBlock,
  watchAnnouncements,
  type Announcement,
  type StealthMatch,
} from "./scan";

export {
  FEE_BUFFER_PERCENT,
  NATIVE_TRANSFER_GAS,
  computeStealthPrivateKey,
  deriveSpendingAccountFor,
  quoteSweep,
  sweepStealthPayment,
  type SweepParams,
  type SweepQuote,
} from "./sweep";
