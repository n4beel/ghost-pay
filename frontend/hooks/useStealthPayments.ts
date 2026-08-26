"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChainId, usePublicClient } from "wagmi";
import { getDeployment, isDeployed } from "@/lib/botchain/contracts";
import { isBotChainId } from "@/lib/botchain/chain";
import {
  scanForPayments,
  watchAnnouncements,
  type StealthMatch,
  type ViewingKeys,
} from "@/lib/stealth";

/**
 * Payments found for the connected identity, from history and from live announcements.
 *
 * There is no server and no index. Every announcement the chain has emitted is read and tested
 * locally, which is precisely why nothing distinguishes a recipient reading their own payment from
 * anyone else reading the same logs.
 */

export type StealthPaymentRow = StealthMatch & {
  /**
   * Live balance at the stealth address, or null while it is still being read.
   *
   * This is the honest answer to "has this been claimed", rather than local bookkeeping that a
   * cleared browser would lose. Zero means swept — by this device or another one.
   */
  balance: bigint | null;
};

export type ScanProgress = { scanned: bigint; head: bigint };

export function useStealthPayments(viewingKeys: ViewingKeys | null) {
  const chainId = useChainId();
  const client = usePublicClient();

  const [payments, setPayments] = useState<StealthPaymentRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Invalidated on every re-scan and on unmount, so a slow scan that is still walking history
  // cannot write its results over a newer one's.
  const runRef = useRef(0);

  const ready = Boolean(viewingKeys) && isBotChainId(chainId) && isDeployed(chainId) && !!client;

  const readBalances = useCallback(
    async (rows: StealthPaymentRow[], run: number) => {
      if (!client) return;
      for (const row of rows) {
        try {
          const balance = await client.getBalance({ address: row.stealthAddress });
          if (runRef.current !== run) return;
          setPayments((current) =>
            current.map((p) =>
              p.stealthAddress === row.stealthAddress ? { ...p, balance } : p,
            ),
          );
        } catch {
          // A failed balance read leaves the row at null, which the UI renders as unknown rather
          // than as claimed. Showing a payment as already swept when it is not would be the one
          // wrong answer here.
        }
      }
    },
    [client],
  );

  // History scan.
  useEffect(() => {
    if (!ready || !client || !viewingKeys || !isBotChainId(chainId)) return;

    const run = ++runRef.current;
    const { announcer, deployBlock } = getDeployment(chainId);

    setScanning(true);
    setError(null);
    setPayments([]);
    setProgress(null);

    scanForPayments({
      client,
      announcer,
      fromBlock: deployBlock,
      keys: viewingKeys,
      onProgress: (scanned, head) => {
        if (runRef.current === run) setProgress({ scanned, head });
      },
      onMatch: (found) => {
        if (runRef.current !== run) return;
        const rows = found.map((match) => ({ ...match, balance: null }));
        setPayments((current) => [...current, ...rows]);
        void readBalances(rows, run);
      },
    })
      .catch((err: unknown) => {
        if (runRef.current !== run) return;
        setError(err instanceof Error ? err.message : "Scan failed");
      })
      .finally(() => {
        if (runRef.current === run) setScanning(false);
      });

    return () => {
      runRef.current += 1;
    };
  }, [ready, client, viewingKeys, chainId, nonce, readBalances]);

  // Live announcements, so a payment arriving while the page is open appears without a re-scan.
  useEffect(() => {
    if (!ready || !client || !viewingKeys || !isBotChainId(chainId)) return;

    const { announcer } = getDeployment(chainId);
    let stop: (() => void) | undefined;

    try {
      stop = watchAnnouncements({
        client,
        announcer,
        keys: viewingKeys,
        onMatch: (match) => {
          setPayments((current) => {
            // The history scan and the watcher overlap around the head; the same announcement can
            // legitimately arrive twice.
            if (current.some((p) => p.stealthAddress === match.stealthAddress)) return current;
            return [...current, { ...match, balance: null }];
          });
          void readBalances([{ ...match, balance: null }], runRef.current);
        },
        onError: (err) => setError(err.message),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not watch for payments");
    }

    return () => stop?.();
  }, [ready, client, viewingKeys, chainId, readBalances]);

  const rescan = useCallback(() => setNonce((n) => n + 1), []);

  const refreshBalances = useCallback(() => {
    setPayments((current) => {
      void readBalances(current, runRef.current);
      return current;
    });
  }, [readBalances]);

  return { payments, scanning, progress, error, rescan, refreshBalances, ready };
}
