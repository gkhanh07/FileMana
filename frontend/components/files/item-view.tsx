"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { itemKey, type ItemDetail, type ItemsPage } from "@/lib/files";
import { FileView } from "./file-view";
import { FilesError, FilesMissing } from "./file-states";
import { FolderView, type FolderFilter } from "./folder-view";

export function ItemView({ initial, childrenPage, type, q, timeZone }: { initial: ItemDetail; childrenPage?: ItemsPage; type: FolderFilter; q: string; timeZone: string }) {
  const query = useQuery({ queryKey: itemKey(initial.id), queryFn: () => api<ItemDetail>(`/items/${initial.id}`), initialData: initial });
  if (query.isError) return query.error instanceof ApiError && query.error.statusCode === 404 ? <FilesMissing /> : <div className="p-6"><FilesError retry={() => query.refetch()} /></div>;
  const item = query.data;
  if (item.kind === "FOLDER") return <FolderView item={item} timeZone={timeZone} initial={childrenPage ?? { items: [], hasMore: false }} initialType={type} initialQ={q} />;
  return <FileView item={item} timeZone={timeZone} />;
}
