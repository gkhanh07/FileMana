"use client";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-start gap-4 p-6">
      <h1 className="font-heading text-3xl">{strings.gateError.title}</h1>
      <Button onClick={reset}>{strings.gateError.retry}</Button>
    </main>
  );
}
