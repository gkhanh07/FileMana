"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveError } from "@/components/tasks/task-row";
import { api } from "@/lib/api/client";
import { childrenKey, type Item, type ItemDetail, type ItemsPage } from "@/lib/files";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { FileBreadcrumb } from "./breadcrumb";
import { FileTable } from "./file-table";
import { FilesError, FilesLoading } from "./file-states";
import { useUploads } from "./upload-provider";

const t = strings.files;
export type FolderFilter = "all" | "files";
export function parseFolderFilter(type: string | undefined | null): FolderFilter { return type === "files" ? type : "all"; }
export function childrenUrl(id: string, type: FolderFilter, q: string, offset = 0) { return `/items/${id}/children?${new URLSearchParams({ type, q, offset: String(offset), limit: "50" })}`; }

export function FolderView({ item, timeZone, initial, initialType, initialQ }: { item: ItemDetail; timeZone: string; initial: ItemsPage; initialType: FolderFilter; initialQ: string }) {
  const qc = useQueryClient();
  const params = useSearchParams();
  const type = parseFolderFilter(params.get("type"));
  const q = params.get("q") ?? "";
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);
  const { pick, upload, setCurrentFolder } = useUploads();
  useEffect(() => { setCurrentFolder({ id: item.id, readOnly: item.readOnly }); return () => setCurrentFolder(null); }, [item.id, item.readOnly, setCurrentFolder]);
  const query = useInfiniteQuery({
    queryKey: [...childrenKey(item.id), type, q],
    queryFn: ({ pageParam }) => api<ItemsPage>(childrenUrl(item.id, type, q, pageParam)),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => last.hasMore ? pages.length * 50 : undefined,
    initialData: type === initialType && q === initialQ ? { pages: [initial], pageParams: [0] } : undefined,
  });
  const update = (patch: { type?: FolderFilter; q?: string }) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) { if (!value || value === "all") next.delete(key); else next.set(key, value); }
    window.history.replaceState(null, "", `${location.pathname}${next.size ? `?${next}` : ""}`);
  };
  const create = useMutation({
    mutationFn: () => api<Item>("/items", { method: "POST", body: { parentId: item.id, name: name.trim() } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKey(item.id) });
      setCreatingFolder(false); setName("");
    }, onError: saveError,
  });
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
  return <section className={cn("flex flex-col gap-4 p-6", dragging && "bg-muted outline-2 outline-primary")}
    onDragOver={(e) => { if (!item.readOnly && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={(e) => { e.preventDefault(); setDragging(false); if (!item.readOnly) for (const file of Array.from(e.dataTransfer.files)) void upload(file, { parentId: item.id }).catch(() => {}); }}>
    <FileBreadcrumb item={item} />
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl">{item.name}</h1><div className="flex gap-2"><Button variant="outline" disabled={item.readOnly} onClick={() => setCreatingFolder(true)}><FolderPlus />{t.newFolder}</Button><Button disabled={item.readOnly} onClick={() => pick({ parentId: item.id })}><Upload />{t.upload}</Button></div></div>
    {item.readOnly && <p className="text-sm text-muted-foreground">{t.readOnly}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div role="group" aria-label={t.type} className="flex gap-1">{(["all", "files"] as const).map((filter) => <Button key={filter} variant={type === filter ? "secondary" : "ghost"} size="sm" aria-pressed={type === filter} onClick={() => update({ type: filter })}>{t.filters[filter]}</Button>)}</div><Input type="search" aria-label={t.search} placeholder={t.search} value={q} onChange={(e) => update({ q: e.target.value })} className="w-64" /></div>
    {dragging && <p role="status" className="text-sm">{t.drop}</p>}
    {query.isPending ? <FilesLoading /> : query.isError ? <FilesError retry={() => query.refetch()} /> : rows.length ? <FileTable items={rows} timeZone={timeZone} readOnly={item.readOnly} parentId={item.id} /> : <div className="flex flex-col items-center gap-3 rounded-md border border-dashed py-12"><p className="text-sm text-muted-foreground">{q || type !== "all" ? t.noResults : t.empty}</p>{!item.readOnly && !q && type === "all" && <Button variant="outline" onClick={() => pick({ parentId: item.id })}><Upload />{t.upload}</Button>}</div>}
    {query.hasNextPage && <Button variant="outline" className="self-center" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{t.more}</Button>}
    <Dialog open={creatingFolder} onOpenChange={setCreatingFolder}><DialogContent><DialogHeader><DialogTitle>{t.newFolder}</DialogTitle><DialogDescription>{item.name}</DialogDescription></DialogHeader><form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (name.trim() && !create.isPending) create.mutate(); }}><Input autoFocus aria-label={t.folderName} maxLength={255} value={name} onChange={(e) => setName(e.target.value)} /><DialogFooter><Button type="button" variant="outline" onClick={() => setCreatingFolder(false)}>{t.cancel}</Button><Button disabled={!name.trim() || create.isPending}>{t.newFolder}</Button></DialogFooter></form></DialogContent></Dialog>
  </section>;
}
