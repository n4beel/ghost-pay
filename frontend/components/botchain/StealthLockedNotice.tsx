"use client";

import Link from "next/link";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import { useStealth } from "@/components/providers/StealthProvider";

/**
 * Shown where stealth payments would go when the identity is still locked.
 *
 * Nothing about incoming payments is visible without the viewing key — that is the design, not a
 * limitation, and the copy says so rather than reading as an error. Unlocking happens on Receive
 * so there is one place that prompts for signatures, instead of every page asking independently.
 */
export default function StealthLockedNotice({ what }: { what: string }) {
  const { status, unlock } = useStealth();

  return (
    <Panel>
      <p
        className="text-[11px] uppercase tracking-[0.04em] mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {what}
      </p>
      <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--text-tertiary)" }}>
        Stealth payments are only visible to your viewing key, and that key is derived from a
        signature rather than stored. Unlock to see them.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={status === "unlocking"} onClick={unlock}>
          Unlock stealth keys
        </Button>
        <Link href="/receive">
          <Button size="sm" variant="ghost">
            Go to Receive
          </Button>
        </Link>
      </div>
    </Panel>
  );
}
