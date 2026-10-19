"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, SquareCheckBig } from "lucide-react";
import { toast } from "sonner";
import { FileTypeIcon } from "@/components/files/file-icon";
import { saveError } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";

const t = strings.trash;
type Entry = components["schemas"]["TrashEntryDto"];
type Page = components["schemas"]["TrashPageDto"];
const LIMIT = 50;
const DAY = 86_400_000;

const daysLeft = (deletedAt: string) => Math.ceil((Date.parse(deletedAt) + 30 * DAY - Date.now()) / DAY);

function TypeIcon({ entry }: { entry: Entry }) {
  if (entry.type === "item") return <FileTypeIcon item={{ kind: entry.kind ?? "FILE", name: entry.name }} className="size-4 shrink-0" />;
  const Icon = entry.type === "task" ? SquareCheckBig : FolderKanban;
  return <Icon aria-hidden className="size-4 shrink-0" />;
}

export function TrashList({ timeZone }: { timeZone: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [purging, setPurging] = useState<Entry | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["trash"],
    queryFn: ({ pageParam }) => api<Page>(`/trash?offset=${pageParam}&limit=${LIMIT}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * LIMIT : undefined),
  });
  const done = (message: string) => {
    toast.success(message);
    void qc.invalidateQueries();
    router.refresh();
  };
  const restore = useMutation({
    mutationFn: (e: Entry) => api(`/trash/${e.type}/${e.id}/restore`, { method: "POST" }),
    onSuccess: (_, e) => done(t.restored(e.name)),
    onError: saveError,
  });
  const purge = useMutation({
    mutationFn: (e: Entry) => api(`/trash/${e.type}/${e.id}`, { method: "DELETE" }),
    onSuccess: (_, e) => {
      setPurging(null);
      done(t.purged(e.name));
    },
    onError: saveError,
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t.error}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          {t.retry}
        </Button>
      </div>
    );
  }
  const rows = query.data.pages.flatMap((p) => p.items);
  if (!rows.length) {
    return <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <table className="w-full table-fixed text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="h-9 border-b">
            <th className="font-medium">{t.name}</th>
            <th className="w-44 font-medium">{t.location}</th>
            <th className="w-52 font-medium">{t.deletedAt}</th>
            <th className="w-52">
              <span className="sr-only">{t.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={`${e.type}:${e.id}`} className="h-9 border-b">
              <td>
                <span className="flex items-center gap-2">
                  <TypeIcon entry={e} />
                  <span className="sr-only">{t.types[e.type]}:</span>
                  <span className="truncate">{e.name}</span>
                </span>
              </td>
              <td className="truncate text-muted-foreground">{e.location ?? "—"}</td>
              <td className="text-muted-foreground">
                {formatRelative(e.deletedAt, timeZone)} · {t.left(daysLeft(e.deletedAt))}
              </td>
              <td className="text-right">
                <Button variant="ghost" size="sm" disabled={restore.isPending} onClick={() => restore.mutate(e)} aria-label={`${t.restore} ${e.name}`}>
                  {t.restore}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPurging(e)} aria-label={`${t.purge} ${e.name}`}>
                  {t.purge}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {query.hasNextPage && (
        <Button variant="outline" className="self-center" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {t.more}
        </Button>
      )}
      <Dialog open={!!purging} onOpenChange={(open) => !open && setPurging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription>{purging && t.confirmBody(purging.name)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurging(null)}>
              {t.cancel}
            </Button>
            <Button variant="destructive" disabled={purge.isPending} onClick={() => purging && purge.mutate(purging)}>
              {t.purge}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
