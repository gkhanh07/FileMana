"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ellipsis, GitMerge, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { projectColorClass } from "@/components/projects/project-bits";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { PROJECT_COLORS } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { Section, showError } from "./personal-settings";

type LabelSummary = components["schemas"]["LabelSummaryDto"];
type Editing = { kind: "add" } | { kind: "edit" | "merge" | "delete"; label: LabelSummary };

const t = strings.settings.labels;

export function LabelsSettings() {
  const {
    data: labels,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["labels"],
    queryFn: () => api<LabelSummary[]>("/labels"),
  });
  const [editing, setEditing] = useState<Editing>();

  return (
    <Section title={t.title}>
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">{t.intro}</p>
        <Button variant="outline" size="sm" onClick={() => setEditing({ kind: "add" })}>
          <Plus />
          {t.add}
        </Button>
      </div>
      {isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex items-center gap-3 text-sm">
          <span className="text-destructive">{t.loadFailed}</span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t.retry}
          </Button>
        </div>
      ) : labels.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {labels.map((l) => (
            <li key={l.id} className="flex h-10 items-center gap-3 px-3 text-sm">
              <span aria-hidden className={cn("size-3 shrink-0 rounded-full", projectColorClass(l.color))} />
              <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
              <span className="text-muted-foreground tabular-nums">{t.taskCount(l.taskCount)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t.actions(l.name)}>
                    <Ellipsis />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditing({ kind: "edit", label: l })}>
                    <Pencil />
                    {t.edit}
                  </DropdownMenuItem>
                  {labels.length > 1 && (
                    <DropdownMenuItem onSelect={() => setEditing({ kind: "merge", label: l })}>
                      <GitMerge />
                      {t.merge}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onSelect={() => setEditing({ kind: "delete", label: l })}>
                    <Trash2 />
                    {t.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      {editing?.kind === "add" && <LabelDialog onClose={() => setEditing(undefined)} />}
      {editing?.kind === "edit" && <LabelDialog label={editing.label} onClose={() => setEditing(undefined)} />}
      {editing?.kind === "merge" && (
        <MergeDialog
          label={editing.label}
          targets={(labels ?? []).filter((l) => l.id !== editing.label.id)}
          onClose={() => setEditing(undefined)}
        />
      )}
      {editing?.kind === "delete" && <DeleteDialog label={editing.label} onClose={() => setEditing(undefined)} />}
    </Section>
  );
}

// Label chips show on every task view, so every change refetches everything.
function useLabelMutation<T>(fn: (body: T) => Promise<unknown>, done: string, onClose: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(done);
      void qc.invalidateQueries();
      onClose();
    },
    onError: showError,
  });
}

function LabelDialog({ label, onClose }: { label?: LabelSummary; onClose: () => void }) {
  const [color, setColor] = useState(label?.color ?? PROJECT_COLORS[0]);
  const save = useLabelMutation(
    (body: { name: string; color: string }) =>
      label ? api(`/labels/${label.id}`, { method: "PATCH", body }) : api("/labels", { method: "POST", body }),
    label ? t.saved : t.created,
    onClose,
  );
  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{label ? t.editTitle : t.add}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get("name")).trim();
            if (!save.isPending) save.mutate({ name, color });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label-name">{t.name}</Label>
            <Input
              id="label-name"
              name="name"
              required
              maxLength={40}
              pattern=".*\S.*"
              defaultValue={label?.name}
              autoFocus
            />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{t.color}</legend>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c, i) => (
                <label key={c} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    checked={color === c}
                    onChange={() => setColor(c)}
                    aria-label={t.colorOption(i + 1)}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "block size-6 rounded-sm ring-offset-2 ring-offset-popover peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4",
                      projectColorClass(c),
                    )}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button variant="outline" type="button" disabled={save.isPending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {label ? t.save : t.add}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({
  label,
  targets,
  onClose,
}: {
  label: LabelSummary;
  targets: LabelSummary[];
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState<string>();
  const merge = useLabelMutation(
    (id: string) =>
      api(`/labels/${label.id}/merge`, {
        method: "POST",
        body: { targetId: id },
      }),
    t.merged,
    onClose,
  );
  return (
    <Dialog open onOpenChange={(open) => !open && !merge.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.mergeTitle(label.name)}</DialogTitle>
          <DialogDescription>{t.mergeHint}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="merge-target">{t.mergeTarget}</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger id="merge-target" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  <span aria-hidden className={cn("size-2.5 rounded-full", projectColorClass(l.color))} />
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={merge.isPending} onClick={onClose}>
            {t.cancel}
          </Button>
          <Button disabled={!targetId || merge.isPending} onClick={() => targetId && merge.mutate(targetId)}>
            {t.mergeConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ label, onClose }: { label: LabelSummary; onClose: () => void }) {
  const remove = useLabelMutation(() => api(`/labels/${label.id}`, { method: "DELETE" }), t.deleted, onClose);
  return (
    <Dialog open onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.deleteTitle(label.name)}</DialogTitle>
          <DialogDescription>{t.deleteHint(label.taskCount)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={remove.isPending} onClick={onClose}>
            {t.cancel}
          </Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(undefined)}>
            {t.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
