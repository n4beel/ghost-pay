import { getUmbraRelayer } from "@umbra-privacy/sdk";

const RELAYER_URL =
  process.env.UMBRA_RELAYER_URL ?? "https://relayer.api.umbraprivacy.com";

export function initUmbraRelayer() {
  return getUmbraRelayer({ apiEndpoint: RELAYER_URL });
}
