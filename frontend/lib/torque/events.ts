export type TorqueEventName =
  | "private_payment_sent"
  | "shield_completed"
  | "claim_completed"
  | "payroll_executed"
  | "compliance_grant_issued";

export interface TorqueEventData {
  route?: string;
  token?: string;
  amount?: number;
}

export function trackEvent(
  userPubkey: string,
  eventName: TorqueEventName,
  data?: TorqueEventData,
): void {
  fetch("/api/torque", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userPubkey,
      timestamp: new Date().toISOString(),
      eventName,
      data: data ?? {},
    }),
  }).catch(() => {
    // fire-and-forget — never throw
  });
}
