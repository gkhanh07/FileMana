"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label as FieldLabel } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { Person } from "@/lib/projects";
import { errorMessage, strings } from "@/lib/strings";
import { TASK_PRIORITIES, TASK_STATUSES, type MyTask, type Task, type TaskDetail, type TaskPatch } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityIcon, StatusIcon, TaskDue } from "./task-bits";

const t = strings.tasks;
export const tasksKey = (projectId: string) => ["tasks", projectId];
export const taskKey = (key: string) => ["task", key];
export const activityKey = (id: string) => ["activity", id];
/** Home and My Tasks (FR-HOME-02, FR-MY-01). */
export const myTasksKey = ["my-tasks"];
/** Shared by the rows and the column header so they line up. */
export const ROW_GRID = "grid grid-cols-[4.5rem_minmax(0,1fr)_8.5rem_8rem_10rem_9rem] gap-3 px-4";

/** A server error has its own text; anything else (offline, timeout) gets the FR-UI-05 "not saved" text. */
export const saveError = (e: unknown) =>
  toast.error(e instanceof ApiError && e.code !== "NETWORK" ? errorMessage(e.code) : t.saveFailed);

/** Puts a task into every cache that shows it: the project list, my tasks, its panel, its parent's subtasks. */
export function useReplaceTask() {
  const qc = useQueryClient();
  return (task: Task) => {
    qc.setQueryData<Task[]>(tasksKey(task.projectId), (list) => list?.map((x) => (x.id === task.id ? task : x)));
    qc.setQueryData<MyTask[]>(myTasksKey, (list) => list?.map((x) => (x.id === task.id ? { ...x, ...task } : x)));
    qc.setQueriesData<TaskDetail>({ queryKey: ["task"] }, (d) =>
      !d
        ? d
        : d.id === task.id
          ? { ...d, ...task }
          : { ...d, subtasks: d.subtasks.map((x) => (x.id === task.id ? task : x)) },
    );
  };
}

// FR-TASK-04, FR-UI-05, NFR-02: the task changes at once and goes back if the API says no.
export function useUpdateTask() {
  const qc = useQueryClient();
  const replace = useReplaceTask();
  return useMutation({
    mutationFn: ({ task, patch }: { task: Task; patch: TaskPatch; shown: Partial<Task> }) =>
      api<Task>(`/tasks/${task.id}`, { method: "PATCH", body: patch }),
    onMutate: async ({ task, shown }) => {
      await qc.cancelQueries({ queryKey: tasksKey(task.projectId) });
      await qc.cancelQueries({ queryKey: ["task"] });
      await qc.cancelQueries({ queryKey: myTasksKey });
      replace({ ...task, ...shown });
    },
    onSuccess: replace,
    // Only this task goes back, so another edit in flight keeps its value.
    onError: (e, { task }) => {
      replace(task);
      saveError(e);
    },
    onSettled: (_, __, { task }) => qc.invalidateQueries({ queryKey: activityKey(task.id) }),
  });
}

export const usePeople = (enabled = true) =>
  useQuery({ queryKey: ["users"], queryFn: () => api<Person[]>("/users"), enabled });

/** One inline edit: `shown` is what the task looks like until the API answers. */
export function useEditTask(task: Task) {
  const update = useUpdateTask();
  return (patch: TaskPatch, shown: Partial<Task> = patch as Partial<Task>) => update.mutate({ task, patch, shown });
}

export const statusShown = (status: Task["status"]) => ({
  status,
  completedAt: status === "DONE" ? new Date().toISOString() : null,
});

export function TaskRow({
  task,
  timeZone,
  readOnly,
  highlight,
  onOpen,
}: {
  task: Task;
  timeZone: string;
  readOnly: boolean;
  highlight: boolean;
  onOpen: (key: string) => void;
}) {
  const edit = useEditTask(task);

  return (
    <li
      id={`task-${task.key}`}
      className={cn(
        // NFR-03: the browser skips laying out rows that are off screen.
        ROW_GRID,
        "h-9 items-center border-b text-sm [contain-intrinsic-size:auto_36px] [content-visibility:auto] hover:bg-muted/50",
        highlight && "bg-accent",
      )}
    >
      <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
      <span className="flex min-w-0 items-center gap-2">
        {/* FR-TASK-13: the title opens the panel. */}
        <button
          type="button"
          onClick={() => onOpen(task.key)}
          className={cn("truncate text-left hover:underline", task.status === "DONE" && "text-muted-foreground")}
        >
          {task.title}
        </button>
        {task.labels.map((l) => (
          <LabelChip key={l.id} label={l} />
        ))}
      </span>
      <Pick
        label={t.edit(t.fields.status, task.key)}
        disabled={readOnly}
        value={task.status}
        options={TASK_STATUSES.map((s) => ({ value: s, text: t.status[s], icon: <StatusIcon status={s} /> }))}
        onChange={(status) => edit({ status }, statusShown(status))}
      />
      <Pick
        label={t.edit(t.fields.priority, task.key)}
        disabled={readOnly}
        value={task.priority}
        options={TASK_PRIORITIES.map((p) => ({ value: p, text: t.priority[p], icon: <PriorityIcon priority={p} /> }))}
        onChange={(priority) => edit({ priority })}
      />
      <AssigneePick task={task} disabled={readOnly} onChange={(a) => edit({ assigneeId: a?.id ?? null }, { assignee: a })} />
      <DuePick task={task} timeZone={timeZone} disabled={readOnly} onChange={(due) => edit(due)} />
    </li>
  );
}

export function Pick<V extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: V;
  options: { value: V; text: string; icon: React.ReactNode }[];
  disabled: boolean;
  onChange: (value: V) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="ghost" size="sm" aria-label={label} className="-ml-1.5 justify-start px-1.5 font-normal disabled:opacity-100">
          {current?.icon}
          <span className="truncate">{current?.text}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => v !== value && onChange(v as V)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.icon}
              {o.text}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssigneePick({
  task,
  label = t.edit(t.fields.assignee, task.key),
  disabled,
  onChange,
}: {
  task: Task;
  label?: string;
  disabled: boolean;
  onChange: (assignee: Person | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // Loaded the first time someone opens a picker; shared by every row.
  const people = usePeople(open);
  const value = task.assignee?.id ?? "none";
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          className="-ml-1.5 justify-start px-1.5 font-normal disabled:opacity-100"
        >
          {task.assignee ? (
            <>
              <UserAvatar user={task.assignee} className="size-5 text-[10px]" />
              <span className="truncate">{task.assignee.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{t.unassigned}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(id) => id !== value && onChange(people.data?.find((p) => p.id === id) ?? null)}
        >
          <DropdownMenuRadioItem value="none">{t.unassigned}</DropdownMenuRadioItem>
          {(people.data ?? (task.assignee ? [task.assignee] : [])).map((p) => (
            <DropdownMenuRadioItem key={p.id} value={p.id}>
              <UserAvatar user={p} className="size-5 text-[10px]" />
              {p.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// A date plus an optional time, both in workspace time (CLAUDE.md, API Contract).
export function DuePick({
  task,
  label = t.edit(t.fields.due, task.key),
  timeZone,
  disabled,
  onChange,
}: {
  task: Task;
  label?: string;
  timeZone: string;
  disabled: boolean;
  onChange: (due: { dueDate: string | null; dueTime: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const save = (dueDate: string | null, dueTime: string | null) => {
    setOpen(false);
    if (dueDate !== task.dueDate || dueTime !== task.dueTime) onChange({ dueDate, dueTime });
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(task.dueDate ?? "");
          setTime(task.dueTime ?? "");
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          className="-ml-1.5 justify-start px-1.5 font-normal disabled:opacity-100"
        >
          {task.dueDate ? <TaskDue task={task} timeZone={timeZone} /> : <span className="text-muted-foreground">{t.noDue}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save(date || null, date && time ? time : null);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`due-date-${task.id}`}>{t.dueEditor.date}</FieldLabel>
            <Input id={`due-date-${task.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor={`due-time-${task.id}`}>{t.dueEditor.time}</FieldLabel>
            <Input
              id={`due-time-${task.id}`}
              type="time"
              value={time}
              disabled={!date}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={!task.dueDate} onClick={() => save(null, null)}>
              {t.dueEditor.clear}
            </Button>
            <Button type="submit" size="sm">
              {t.dueEditor.save}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
