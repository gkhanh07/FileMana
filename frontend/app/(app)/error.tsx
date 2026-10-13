"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";
import { strings } from "@/lib/strings";

// FR-UI-03: plain-language message with Retry.
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className="flex flex-1 flex-col items-start gap-3 p-6">
      <h1 className="text-2xl">{strings.gateError.title}</h1>
      <p className="text-sm text-muted-foreground">{strings.gateError.message}</p>
      <Button onClick={reset}>{strings.gateError.retry}</Button>
    </main>
  );
}
