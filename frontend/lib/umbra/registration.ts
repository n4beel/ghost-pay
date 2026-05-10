import { getUserRegistrationFunction, getUserAccountQuerierFunction } from "@umbra-privacy/sdk";
import type { UmbraClient } from "./client";
import { getRegistrationProver } from "./prover";

export async function registerUser(client: UmbraClient): Promise<void> {
  const register = getUserRegistrationFunction(
    { client },
    { zkProver: getRegistrationProver() },
  );
  await register({ confidential: true, anonymous: true });
}

export async function isUserRegistered(client: UmbraClient): Promise<boolean> {
  try {
    const querier = getUserAccountQuerierFunction({ client });
    const result = await querier(client.signer.address);
    // Must check state === "exists" — non_existent still returns a non-null object
    // Must also verify X25519 key is registered — required for shared-mode and MXE conversion
    return result?.state === "exists" && result.data.isUserAccountX25519KeyRegistered === true;
  } catch {
    return false;
  }
}

const REGISTRATION_KEY = "ghost_pay_registered";

export function getCachedRegistration(address: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${REGISTRATION_KEY}_${address}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedRegistration(address: string, registered: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${REGISTRATION_KEY}_${address}`, JSON.stringify(registered));
  } catch {
    // ignore
  }
}
