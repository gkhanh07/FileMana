import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Project } from "@/lib/projects";
import type { User, Workspace } from "./client";
import { ApiError, readApiError } from "./error";

// Server Components call the API directly (over the compose network) and forward the session cookie.
const API_URL = process.env.API_URL ?? "http://localhost:3001";

export async function serverApi<T>(path: string): Promise<T> {
  const cookie = (await cookies()).toString();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { cookie },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Network error");
  }
  if (!res.ok) throw await readApiError(res);
  return (await res.json()) as T;
}

// Deduplicated per request, so the auth gate and the page share one call.
// A 401 means no valid session: both callers send the visitor to sign-in.
export const getMe = cache(async () => {
  try {
    return await serverApi<User>("/me");
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 401) redirect("/sign-in");
    throw e;
  }
});

export const getWorkspace = cache(() => serverApi<Workspace>("/workspace"));

// The project layout and its tabs share one call; a missing project is a 404 page.
export const getProject = cache(async (id: string) => {
  try {
    return await serverApi<Project>(`/projects/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) notFound();
    throw e;
  }
});
