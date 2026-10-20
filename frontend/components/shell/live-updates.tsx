"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "@/lib/api/client";

const REFRESH_DELAY = 1000;
const MAX_RETRY = 30_000;

/** Refetches what the page shows when anyone changes something (NFR-14). */
export function LiveUpdates() {
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    let source: EventSource | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retry = REFRESH_DELAY;
    let missed = false;

    // Events that arrive while a refresh is waiting fold into it; it waits for this tab's own saves to finish.
    const refresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(function run() {
        if (qc.isMutating()) return void (refreshTimer = setTimeout(run, REFRESH_DELAY));
        refreshTimer = undefined;
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "preview" });
        router.refresh();
      }, REFRESH_DELAY);
    };
    const connect = () => {
      source = new EventSource(`${BASE_URL}/events`, { withCredentials: true });
      source.onmessage = refresh;
      source.onopen = () => {
        retry = REFRESH_DELAY;
        if (missed) refresh();
        missed = false;
      };
      source.onerror = () => {
        source?.close();
        missed = true;
        retryTimer = setTimeout(connect, retry);
        retry = Math.min(retry * 2, MAX_RETRY);
      };
    };
    connect();
    return () => {
      source?.close();
      clearTimeout(refreshTimer);
      clearTimeout(retryTimer);
    };
  }, [qc, router]);

  return null;
}
