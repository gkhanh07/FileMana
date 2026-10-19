"use client";

import { useEffect } from "react";
import { api } from "@/lib/api/client";

export function SessionRefresh() {
  useEffect(() => {
    api("/me").catch(() => {});
  }, []);
  return null;
}
