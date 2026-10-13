import { api } from "./api/client";

// NFR-15: send a browser error to the API's log. Never throws, so reporting can't cause another error.
export function reportError(error: unknown): void {
  const e = error instanceof Error ? error : new Error(String(error));
  api("/client-errors", {
    method: "POST",
    body: { message: e.message.slice(0, 1000), stack: e.stack?.slice(0, 5000), url: location.href.slice(0, 1000) },
  }).catch(() => {});
}
