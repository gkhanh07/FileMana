"use client";

import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { ItemDetail, ItemsPage, Root } from "@/lib/files";
import { strings } from "@/lib/strings";
import { FilesError } from "./file-states";

const t = strings.files;
export function FolderPicker({ excluded, onChoose }: { excluded: string; onChoose: (id: string) => void }) {
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const folder = path.at(-1);
  const roots = useQuery({ queryKey: ["roots"], queryFn: () => api<Root[]>("/items/roots") });
  const children = useInfiniteQuery({
    queryKey: ["items", folder?.id, "picker"],
    queryFn: ({ pageParam }) => api<ItemsPage>(`/items/${folder!.id}/children?offset=${pageParam}&limit=50`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => last.hasMore ? pages.length * 50 : undefined,
    enabled: !!folder,
  });
  const detail = useQuery({ queryKey: ["item", folder?.id], queryFn: () => api<ItemDetail>(`/items/${folder!.id}`), enabled: !!folder });
  const error = folder ? children.isError || detail.isError : roots.isError;
  const list = folder ? children.data?.pages.flatMap((p) => p.items).filter((i) => i.kind === "FOLDER") : roots.data?.filter((r) => !r.project?.archived);
  return <div className="flex flex-col gap-3">
    <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={!folder} onClick={() => setPath((p) => p.slice(0, -1))}>{t.back}</Button><span className="truncate text-sm">{folder?.name ?? t.title}</span></div>
    {error ? <FilesError retry={() => { void roots.refetch(); void children.refetch(); void detail.refetch(); }} /> : <ul className="max-h-64 overflow-y-auto rounded-md border p-1">{list?.filter((i) => i.id !== excluded).map((item) => <li key={item.id}><Button variant="ghost" className="w-full justify-start" onClick={() => setPath((p) => [...p, { id: item.id, name: item.name }])}><Folder />{item.name}</Button></li>)}{list?.filter((i) => i.id !== excluded).length === 0 && <li className="p-3 text-sm text-muted-foreground">{t.noFolders}</li>}</ul>}
    {children.hasNextPage && <Button variant="outline" disabled={children.isFetchingNextPage} onClick={() => children.fetchNextPage()}>{t.more}</Button>}
    <Button disabled={!folder || detail.isPending || detail.isError || detail.data?.readOnly} onClick={() => folder && onChoose(folder.id)}>{t.chooseFolder}</Button>
  </div>;
}
