import type { components } from "./schema";
import { ApiError, readApiError } from "./error";

export type User = components["schemas"]["UserDto"];

// Browser-side API access (mutations and client-side fetches); the session cookie rides along.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function api<T = void>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Network error");
  }
  if (!res.ok) throw await readApiError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
