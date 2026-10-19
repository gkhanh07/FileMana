"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { saveError } from "@/components/tasks/task-row";
import { api } from "@/lib/api/client";
import { formatDueDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import type { Milestone } from "@/lib/tasks";

const o = strings.projects.overview;
export const milestonesKey = (projectId: string) => ["milestones", projectId];

export const useMilestones = (projectId: string, initialData: Milestone[]) =>
  useQuery({
    queryKey: milestonesKey(projectId),
    queryFn: () => api<Milestone[]>(`/projects/${projectId}/milestones`),
    initialData,
    staleTime: 0,
  });

export function Milestones({
  projectId,
  initial,
  readOnly,
}: {
  projectId: string;
  initial: Milestone[];
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const { data: milestones } = useMilestones(projectId, initial);
  const [editing, setEditing] = useState<Milestone | null | undefined>();
  const refresh = () => qc.invalidateQueries({ queryKey: milestonesKey(projectId) });
  const remove = useMutation({
    mutationFn: (m: Milestone) => api(`/milestones/${m.id}`, { method: "DELETE" }),
    onSuccess: (_, m) => {
      qc.setQueryData<Milestone[]>(milestonesKey(projectId), (list) => list?.filter((x) => x.id !== m.id));
      toast.success(o.milestoneDeleted(m.name), {
        action: {
          label: strings.tasks.detail.undo,
          onClick: () => api(`/milestones/${m.id}/restore`, { method: "POST" }).then(refresh, saveError),
        },
      });
    },
    onError: saveError,
  });

  return (
    <section aria-labelledby="milestones" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 id="milestones" className="text-base font-semibold">
          {o.milestones}
        </h2>
        {!readOnly && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(null)}>
            <Plus />
            {o.addMilestone}
          </Button>
        )}
      </div>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">{o.noMilestones}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {milestones.map((m) => {
            const pct = m.taskCount ? Math.round((m.doneCount / m.taskCount) * 100) : 0;
            return (
              <li key={m.id} className="flex h-12 items-center gap-3 px-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                <span className="w-24 text-muted-foreground tabular-nums">{formatDueDate(m.date)}</span>
                <span aria-hidden className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-28 text-right text-muted-foreground tabular-nums">
                  {o.milestoneProgress(m.doneCount, m.taskCount)}
                </span>
                {!readOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={o.milestoneActions(m.name)}>
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(m)}>
                        <Pencil />
                        {o.edit}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => remove.mutate(m)}>
                        <Trash2 />
                        {o.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editing !== undefined && (
        <MilestoneDialog
          projectId={projectId}
          milestone={editing}
          onDone={() => {
            setEditing(undefined);
            void refresh();
          }}
          onCancel={() => setEditing(undefined)}
        />
      )}
    </section>
  );
}

function MilestoneDialog({
  projectId,
  milestone,
  onDone,
  onCancel,
}: {
  projectId: string;
  milestone: Milestone | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const save = useMutation({
    mutationFn: (body: { name: string; date: string }) =>
      milestone
        ? api(`/milestones/${milestone.id}`, { method: "PATCH", body })
        : api(`/projects/${projectId}/milestones`, { method: "POST", body }),
    onSuccess: onDone,
    onError: saveError,
  });
  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onCancel()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{milestone ? o.editMilestone : o.addMilestone}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            if (!save.isPending)
              save.mutate({ name: String(form.get("name")).trim(), date: String(form.get("date")) });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-name">{o.name}</Label>
            <Input
              id="milestone-name"
              name="name"
              required
              maxLength={80}
              pattern=".*\S.*"
              defaultValue={milestone?.name}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-date">{o.date}</Label>
            <Input id="milestone-date" name="date" type="date" required defaultValue={milestone?.date} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" disabled={save.isPending} onClick={onCancel}>
              {o.cancel}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {o.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
