"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Flag, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api/client";
import { strings } from "@/lib/strings";
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskPatch } from "@/lib/tasks";
import { PriorityIcon, StatusIcon } from "./task-bits";
import { refreshMyTasks } from "./task-detail";
import { myTasksKey, saveError, statusShown, tasksKey, usePeople, useUpdateTask } from "./task-row";

const t = strings.tasks;
const b = t.bulk;

/** The old value of every field a patch touches, so Undo can send it back. */
const undoPatch = (task: Task, patch: TaskPatch): TaskPatch =>
  Object.fromEntries(
    Object.keys(patch).map((k) => [k, k === "assigneeId" ? (task.assignee?.id ?? null) : task[k as keyof Task]]),
  );

// FR-TASK-26. ponytail: one request per task; a bulk endpoint if selections ever reach hundreds.
export function TaskBulkBar({
  projectId,
  tasks,
  onClear,
}: {
  projectId: string;
  tasks: Task[];
  onClear: () => void;
}) {
  const qc = useQueryClient();
  const update = useUpdateTask();
  const [peopleOpen, setPeopleOpen] = useState(false);
  const people = usePeople(peopleOpen);
  const [dueOpen, setDueOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  // Each task changes at once and goes back on its own if the API says no (useUpdateTask).
  const apply = (patch: TaskPatch, shown: Partial<Task>) => {
    const before = tasks;
    for (const task of before) update.mutate({ task, patch, shown });
    toast.success(b.updated(before.length), {
      action: {
        label: t.detail.undo,
        onClick: () => {
          for (const task of before) update.mutate({ task: { ...task, ...shown }, patch: undoPatch(task, patch), shown: task });
        },
      },
    });
  };

  const remove = async () => {
    const gone = tasks;
    const ids = new Set(gone.map((x) => x.id));
    const results = await Promise.allSettled(gone.map((x) => api(`/tasks/${x.id}`, { method: "DELETE" })));
    const failed = results.find((r) => r.status === "rejected");
    qc.setQueryData<Task[]>(tasksKey(projectId), (list) => list?.filter((x) => !ids.has(x.id)));
    void refreshMyTasks(qc);
    onClear();
    if (failed) {
      // Some made it to Trash; reload to show which.
      void qc.invalidateQueries({ queryKey: tasksKey(projectId) });
      saveError(failed.reason);
      return;
    }
    toast.success(b.deleted(gone.length), {
      action: {
        label: t.detail.undo,
        onClick: () =>
          Promise.all(gone.map((x) => api(`/tasks/${x.id}/restore`, { method: "POST" })))
            .catch(saveError)
            .finally(() => {
              void qc.invalidateQueries({ queryKey: tasksKey(projectId) });
              void qc.invalidateQueries({ queryKey: myTasksKey });
            }),
      },
    });
  };

  return (
    <div
      role="toolbar"
      aria-label={b.label}
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-popover p-1.5 text-sm shadow-lg"
    >
      <span className="px-2 font-medium tabular-nums">{b.selected(tasks.length)}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <StatusIcon status="IN_PROGRESS" />
            {t.fields.status}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-44">
          {TASK_STATUSES.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => apply({ status: s }, statusShown(s))}>
              <StatusIcon status={s} />
              {t.status[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu open={peopleOpen} onOpenChange={setPeopleOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <UserRound />
            {t.fields.assignee}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-52">
          <DropdownMenuItem onSelect={() => apply({ assigneeId: null }, { assignee: null })}>{t.unassigned}</DropdownMenuItem>
          {people.data?.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => apply({ assigneeId: p.id }, { assignee: p })}>
              <UserAvatar user={p} className="size-5 text-[10px]" />
              {p.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover
        open={dueOpen}
        onOpenChange={(o) => {
          if (o) {
            setDate("");
            setTime("");
          }
          setDueOpen(o);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <CalendarDays />
            {t.fields.due}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-60">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setDueOpen(false);
              const due = { dueDate: date || null, dueTime: date && time ? time : null };
              apply(due, due);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="bulk-due-date">{t.dueEditor.date}</FieldLabel>
              <Input id="bulk-due-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="bulk-due-time">{t.dueEditor.time}</FieldLabel>
              <Input id="bulk-due-time" type="time" value={time} disabled={!date} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDueOpen(false);
                  apply({ dueDate: null, dueTime: null }, { dueDate: null, dueTime: null });
                }}
              >
                {t.dueEditor.clear}
              </Button>
              <Button type="submit" size="sm" disabled={!date}>
                {t.dueEditor.save}
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Flag />
            {t.fields.priority}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-44">
          {TASK_PRIORITIES.map((p) => (
            <DropdownMenuItem key={p} onSelect={() => apply({ priority: p }, { priority: p })}>
              <PriorityIcon priority={p} />
              {t.priority[p]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" onClick={() => void remove()}>
        <Trash2 />
        {b.delete}
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={b.clear} onClick={onClear}>
        <X />
      </Button>
    </div>
  );
}
