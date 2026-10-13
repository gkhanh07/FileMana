"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// NFR-15: uncaught errors and rejected promises anywhere in the signed-in app.
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason);
    addEventListener("error", onError);
    addEventListener("unhandledrejection", onRejection);
    return () => {
      removeEventListener("error", onError);
      removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
