"use client";

import { useEffect } from "react";
import { api } from "@/lib/api/client";

// "Remember me" cookies are renewed by API responses the browser itself receives; page loads are
// fetched by the Next.js server, which drops Set-Cookie. This one call per page load keeps it alive.
export function SessionRefresh() {
  useEffect(() => {
    api("/me").catch(() => {});
  }, []);
  return null;
}
