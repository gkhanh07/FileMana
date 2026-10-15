"use client";
/* eslint-disable @next/next/no-img-element -- signed thumbnails need the browser's session cookie. */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { fileIcon, fileKind, formatSize, rawUrl, type Item } from "@/lib/files";
import { strings } from "@/lib/strings";
import { FilesError } from "./file-states";
import { ItemActions } from "./item-actions";
import { useUploads } from "./upload-provider";

const t = strings.files;
export function Attachments({ taskId, readOnly }: { taskId: string; readOnly: boolean }) {
  const query = useQuery({ queryKey: ["attachments", taskId], queryFn: () => api<Item[]>(`/tasks/${taskId}/attachments`) });
  const { pick, upload } = useUploads();
  return <section aria-label={t.attachments} className="flex flex-col gap-3" onDragOver={(e) => { if (!readOnly && e.dataTransfer.types.includes("Files")) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); if (!readOnly) for (const file of Array.from(e.dataTransfer.files)) void upload(file, { taskId }).catch(() => {}); }}>
    <h3 className="text-sm font-medium">{t.attachments}</h3>
    {query.isPending ? <Skeleton className="h-16 w-full" /> : query.isError ? <FilesError retry={() => query.refetch()} /> : query.data.length ? <ul className="flex flex-col gap-2">{query.data.map((item) => {
      const Icon = fileIcon(item);
      return <li key={item.id} className="flex items-center gap-2 rounded-md border p-2"><Link href={`/docs/${item.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">{fileKind(item.name) === "image" && item.url ? <img src={rawUrl(item.url)} alt="" className="size-10 rounded-md object-cover" /> : <Icon aria-hidden className="size-8 shrink-0 text-muted-foreground" />}<span className="min-w-0"><span className="block truncate text-sm">{item.name}</span><span className="block text-xs text-muted-foreground">{formatSize(item.size)} · {item.creator?.name}</span></span></Link><ItemActions item={item} readOnly={readOnly} /></li>;
    })}</ul> : <p className="text-sm text-muted-foreground">{t.noAttachments}</p>}
    {!readOnly && <div className="rounded-md border border-dashed p-3"><Button variant="outline" size="sm" onClick={() => pick({ taskId })}><Paperclip />{t.attach}</Button></div>}
  </section>;
}
