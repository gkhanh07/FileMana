"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { strings } from "@/lib/strings";

function subscribe(onChange: () => void) {
  addEventListener("online", onChange);
  addEventListener("offline", onChange);
  return () => {
    removeEventListener("online", onChange);
    removeEventListener("offline", onChange);
  };
}

// FR-UI-06: React Query refetches on its own when the connection returns (refetchOnReconnect).
export function OfflineBar() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return (
    <div role="status">
      {!online && (
        <div className="flex h-8 items-center justify-center gap-2 bg-foreground text-sm text-background">
          <WifiOff className="size-4" aria-hidden />
          {strings.offline}
        </div>
      )}
    </div>
  );
}
