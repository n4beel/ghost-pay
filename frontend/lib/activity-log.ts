export interface LocalActivity {
  type: "send" | "send_vault" | "shield" | "unshield" | "claim" | "payroll";
  token: string;
  amount: string;
  timestamp: number;
  txHash?: string;
}

const storageKey = (wallet: string) => `ghost-pay:activity:${wallet}`;

export function logActivity(wallet: string, activity: LocalActivity): void {
  try {
    const existing: LocalActivity[] = JSON.parse(
      localStorage.getItem(storageKey(wallet)) ?? "[]",
    );
    localStorage.setItem(
      storageKey(wallet),
      JSON.stringify([activity, ...existing].slice(0, 50)),
    );
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function loadActivities(wallet: string): LocalActivity[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(wallet)) ?? "[]");
  } catch {
    return [];
  }
}
