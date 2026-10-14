"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { saveError } from "@/components/tasks/task-row";
import { api } from "@/lib/api/client";
import { rawUrl, type Item, type ItemDetail } from "@/lib/files";
import { strings } from "@/lib/strings";
import { FolderPicker } from "./folder-picker";

const t = strings.files;
type Mode = "rename" | "move" | "delete" | null;
// Both menus run the same actions and share dialogs (FR-FILE-08, FR-UI-07).
export function ItemActions({ item, readOnly, parentId, onDeleted, children }: {
  item: Item; readOnly: boolean; parentId?: string; onDeleted?: () => void;
  children?: (menu: React.ReactNode) => React.ReactElement;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState(item.name);
  const refresh = () => {
    for (const key of ["items", "roots", "item", "attachments", "tasks", "my-tasks", "task"]) void qc.invalidateQueries({ queryKey: [key] });
    router.refresh();
  };
  const remove = useMutation({
    mutationFn: () => api(`/items/${item.id}`, { method: "DELETE" }),
    onSuccess: () => {
      setMode(null); onDeleted?.(); refresh();
      toast.success(t.deleted(item.name || t.untitled), { action: { label: strings.tasks.detail.undo, onClick: () => api(`/items/${item.id}/restore`, { method: "POST" }).then(refresh, saveError) } });
    }, onError: saveError,
  });
  const patch = useMutation({
    mutationFn: (body: { name?: string; parentId?: string }) => api<ItemDetail>(`/items/${item.id}`, { method: "PATCH", body }),
    onSuccess: (_, body) => {
      setMode(null); refresh();
      toast.success(body.parentId ? t.moved : t.renamed, body.parentId && parentId ? { action: { label: strings.tasks.detail.undo, onClick: () => api(`/items/${item.id}`, { method: "PATCH", body: { parentId } }).then(refresh, saveError) } } : undefined);
    }, onError: saveError,
  });
  const download = async () => {
    try {
      const fresh = await api<ItemDetail>(`/items/${item.id}`);
      if (fresh.url) { const a = document.createElement("a"); a.href = `${rawUrl(fresh.url)}&dl=1`; a.click(); }
    } catch (e) { saveError(e); }
  };
  const actions = [
    { label: t.preview, run: () => router.push(`/docs/${item.id}`) },
    ...(item.kind === "FILE" ? [{ label: t.download, run: () => void download() }] : []),
    { label: t.rename, disabled: readOnly || item.locked, run: () => { setName(item.name); setMode("rename"); } },
    { label: t.move, disabled: readOnly || item.locked, run: () => setMode("move") },
    { label: t.copyLink, run: () => { void navigator.clipboard.writeText(`${location.origin}/docs/${item.id}`).then(() => toast.success(t.copied), saveError); } },
    { label: t.delete, disabled: readOnly || item.locked || remove.isPending, run: () => item.kind === "FOLDER" && item.childCount > 0 ? setMode("delete") : remove.mutate() },
  ];
  const menu = <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`${t.menu} ${item.name || t.untitled}`}><Ellipsis /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{actions.map((a) => <DropdownMenuItem key={a.label} disabled={a.disabled} onSelect={a.run}>{a.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
  return <>
    {children ? <ContextMenu><ContextMenuTrigger asChild>{children(menu)}</ContextMenuTrigger><ContextMenuContent>{actions.map((a) => <ContextMenuItem key={a.label} disabled={a.disabled} onSelect={a.run}>{a.label}</ContextMenuItem>)}</ContextMenuContent></ContextMenu> : menu}
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open && !patch.isPending && !remove.isPending) setMode(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{mode === "delete" ? t.confirmDelete : mode === "move" ? t.destination : t.rename}</DialogTitle><DialogDescription>{mode === "delete" ? t.confirmBody(item.name) : item.name || t.untitled}</DialogDescription></DialogHeader>
        {mode === "move" && <FolderPicker excluded={item.id} onChoose={(parentId) => { if (!patch.isPending) patch.mutate({ parentId }); }} />}
        {mode === "rename" && <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && !patch.isPending) patch.mutate({ name: name.trim() }); }} className="flex flex-col gap-4"><Input autoFocus aria-label={t.name} maxLength={255} value={name} onChange={(e) => setName(e.target.value)} /><DialogFooter><Button variant="outline" type="button" onClick={() => setMode(null)}>{t.cancel}</Button><Button disabled={!name.trim() || patch.isPending}>{t.save}</Button></DialogFooter></form>}
        {mode === "delete" && <DialogFooter><Button variant="outline" disabled={remove.isPending} onClick={() => setMode(null)}>{t.cancel}</Button><Button disabled={remove.isPending} onClick={() => remove.mutate()}>{t.delete}</Button></DialogFooter>}
      </DialogContent>
    </Dialog>
  </>;
}
