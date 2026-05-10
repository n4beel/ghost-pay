import { getUserRegistrationFunction, getUserAccountQuerierFunction } from "@umbra-privacy/sdk";
import type { UmbraClient } from "./client";

export async function registerUser(client: UmbraClient): Promise<void> {
  const register = getUserRegistrationFunction({ client });
  await register({ confidential: true, anonymous: true });
}

export async function isUserRegistered(client: UmbraClient): Promise<boolean> {
  try {
    const querier = getUserAccountQuerierFunction({ client });
    const result = await querier(client.signer.address);
    return result !== null && result !== undefined;
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
