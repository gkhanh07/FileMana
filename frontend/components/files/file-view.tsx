"use client";
/* eslint-disable @next/next/no-img-element -- signed images need the browser's session cookie. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusIcon } from "@/components/tasks/task-bits";
import { readApiError } from "@/lib/api/error";
import { fileKind, formatSize, itemKey, rawUrl, type ItemDetail } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { errorMessage, strings } from "@/lib/strings";
import { FileBreadcrumb } from "./breadcrumb";
import { FilesError } from "./file-states";
import { ItemActions } from "./item-actions";
import { FileTypeIcon } from "./file-icon";

const t = strings.files;
const PREVIEW_LIMIT = 262144;
export function FileView({ item, timeZone }: { item: ItemDetail; timeZone: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const kind = fileKind(item.name);
  const url = item.url ? rawUrl(item.url) : "";
  const preview = useQuery({
    queryKey: ["preview", url, kind],
    queryFn: async () => {
      const text = kind === "text";
      const response = await fetch(url, { credentials: "include", method: text ? "GET" : "HEAD", headers: text ? { Range: `bytes=0-${PREVIEW_LIMIT - 1}` } : undefined });
      if (text && response.status === 416) return { text: "", truncated: false };
      if (!response.ok) throw await readApiError(response);
      if (!text) return { text: "", truncated: false };
      const bytes = await response.arrayBuffer();
      return { text: new TextDecoder().decode(bytes), truncated: bytes.byteLength >= PREVIEW_LIMIT };
    }, enabled: !!url,
  });
  const refresh = async () => { await qc.invalidateQueries({ queryKey: itemKey(item.id) }); router.refresh(); void preview.refetch(); };
  return <div className="flex flex-col gap-4 p-6">
    <FileBreadcrumb item={item} />
    <div className="flex items-center gap-3"><h1 className="min-w-0 flex-1 truncate text-2xl">{item.name}</h1><Button variant="outline" asChild><a href={`${url}&dl=1`}>{t.download}</a></Button><ItemActions item={item} readOnly={item.readOnly} parentId={item.path.at(-1)?.id} onDeleted={() => router.push(item.path.length ? `/docs/${item.path.at(-1)!.id}` : "/docs")} /></div>
    {item.readOnly && <p className="text-sm text-muted-foreground">{t.readOnly}</p>}
    <div className="flex flex-col gap-6 lg:flex-row">
      <section aria-label={t.preview} className="min-w-0 flex-1 rounded-md border bg-muted/20 p-4">
        {preview.isPending ? <Skeleton className="h-[calc(100dvh-12rem)] min-h-96 w-full" /> : preview.isError ? <><FilesError retry={() => void refresh()} /><p className="text-sm text-muted-foreground">{errorMessage("code" in preview.error ? String(preview.error.code) : "NETWORK")}</p></> : kind === "pdf" ? <iframe src={url} title={item.name} className="h-[calc(100dvh-12rem)] min-h-96 w-full" /> : kind === "image" ? <img src={url} alt={item.name} className="mx-auto max-h-[calc(100dvh-12rem)] max-w-full object-contain" onError={() => void refresh()} /> : kind === "video" ? <video src={url} controls aria-label={item.name} className="max-h-[calc(100dvh-12rem)] min-h-96 w-full" onError={() => void refresh()} /> : kind === "text" ? <><pre className="max-h-[calc(100dvh-12rem)] overflow-auto whitespace-pre-wrap break-words font-mono text-sm">{preview.data?.text || t.emptyFile}</pre>{preview.data?.truncated && <p className="mt-3 text-xs text-muted-foreground">{t.truncated}</p>}</> : <div className="flex min-h-80 flex-col items-center justify-center gap-4"><FileTypeIcon item={item} className="size-16 text-muted-foreground" /><p className="text-sm">{item.name} · {formatSize(item.size)}</p><p className="text-sm text-muted-foreground">{t.unsupported}</p><Button asChild><a href={`${url}&dl=1`}>{t.download}</a></Button></div>}
      </section>
      <aside aria-label={t.info} className="w-full shrink-0 lg:w-64"><dl className="flex flex-col gap-3 text-sm">
        {[[t.name, item.name], [t.type, t.kinds[kind]], [t.size, formatSize(item.size)], [t.uploader, item.creator?.name ?? "—"], [t.created, formatDate(item.createdAt, timeZone)], [t.updated, formatDate(item.updatedAt, timeZone)]].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}
        <div><dt className="text-muted-foreground">{t.project}</dt><dd>{item.project ? <Link href={`/projects/${item.project.id}`} className="hover:underline">{item.project.name}</Link> : "—"}</dd></div>
        <div><dt className="mb-1 text-muted-foreground">{t.tasks}</dt><dd>{item.tasks.length ? item.tasks.map((task) => <Link key={task.id} href={`/tasks/${task.key}`} className="mb-2 flex items-center gap-2 hover:underline"><StatusIcon status={task.status} /><span>{task.key} · {task.title} · {strings.tasks.status[task.status]}</span></Link>) : t.noTasks}</dd></div>
      </dl></aside>
    </div>
  </div>;
}
