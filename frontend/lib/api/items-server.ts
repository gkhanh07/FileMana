import { notFound } from "next/navigation";
import type { ItemDetail, ItemsPage } from "@/lib/files";
import { ApiError } from "./error";
import { serverApi } from "./server";

export async function getItem(path: string) {
  try { return await serverApi<ItemDetail>(path); }
  catch (error) { if (error instanceof ApiError && error.statusCode === 404) notFound(); throw error; }
}
export function getChildren(id: string, type: string, q: string) {
  return serverApi<ItemsPage>(`/items/${id}/children?${new URLSearchParams({ type, q, limit: "50" })}`);
}
