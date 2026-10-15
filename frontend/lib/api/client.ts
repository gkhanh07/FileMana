import type { components } from "./schema";
import { ApiError, readApiError } from "./error";

export type User = components["schemas"]["UserDto"];
export type Theme = components["schemas"]["Theme"];
export type Workspace = components["schemas"]["WorkspaceDto"];

// Browser-side API access (mutations and client-side fetches); the session cookie rides along.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function api<T = void>(
  path: string,
  options: { method?: string; body?: unknown; keepalive?: boolean } = {},
): Promise<T> {
  const json = options.body !== undefined && !(options.body instanceof FormData);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      keepalive: options.keepalive,
      // FormData (file uploads) sets its own multipart Content-Type.
      headers: json ? { "Content-Type": "application/json" } : undefined,
      body: json ? JSON.stringify(options.body) : (options.body as FormData | undefined),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Network error");
  }
  if (!res.ok) throw await readApiError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// The API serves avatars at a path; the browser loads them from the API's origin.
export function avatarSrc(user: { avatarUrl: string | null }): string | undefined {
  return user.avatarUrl ? `${BASE_URL}${user.avatarUrl}` : undefined;
}
