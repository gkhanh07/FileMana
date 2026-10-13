"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { CornerLeftUp, Ellipsis, Link2, Maximize2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { formatDate, formatRelative, formatTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import {
  describeActivity,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Activity,
  type Label,
  type MyTask,
  type Task,
  type TaskDetail as Detail,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityIcon, StatusIcon } from "./task-bits";
import {
  activityKey,
  AssigneePick,
  DuePick,
  myTasksKey,
  Pick,
  saveError,
  statusShown,
  taskKey,
  tasksKey,
  useEditTask,
} from "./task-row";

const t = strings.tasks;
const d = t.detail;
const TaskEditor = dynamic(() => import("./task-editor"), {
  ssr: false,
  loading: () => <Skeleton className="h-24 w-full" />,
});

/** How a task link opens: in the panel (`onOpen`) or as its own page. */
type Open = ((key: string) => void) | undefined;

// FR-TASK-13: the open task lives in the URL (?task=KEY), so a reload or a shared link reopens it.
export function useOpenTask() {
  const openKey = useSearchParams().get("task");
  const openTask = (key: string) => {
    const params = new URLSearchParams(location.search);
    params.set("task", key);
    window.history.pushState(null, "", `?${params}`);
  };
  const closeTask = () => {
    const params = new URLSearchParams(location.search);
    params.delete("task");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : location.pathname);
  };
  return { openKey, openTask, closeTask };
}

/** A new task may be mine, so Home and My Tasks load again. */
export const refreshMyTasks = (qc: QueryClient) => qc.invalidateQueries({ queryKey: myTasksKey });

// FR-TASK-13: a 520px panel from the right. Not modal, so the list behind stays usable.
export function TaskPanel({
  taskKey: key,
  timeZone,
  onOpen,
  onClose,
}: {
  taskKey: string;
  timeZone: string;
  onOpen: (key: string) => void;
  onClose: () => void;
}) {
  // Esc closes, unless it belongs to a menu, a dialog or a field (there it only leaves the field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[data-radix-popper-content-wrapper], [role=dialog][data-state=open]")) return;
      const field = (e.target as HTMLElement).closest?.("input, textarea, [contenteditable=true]");
      if (field instanceof HTMLElement) field.blur();
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      aria-label={d.label(key)}
      className="fixed top-13 right-0 bottom-0 z-20 flex w-[520px] max-w-full flex-col border-l bg-background shadow-xl animate-in duration-200 slide-in-from-right"
    >
      <TaskDetail key={key} taskKey={key} timeZone={timeZone} onOpen={onOpen} onClose={onClose} />
    </aside>
  );
}

// The panel's content, also the full page (FR-SHELL-07) when `onClose` is left out.
export function TaskDetail({
  taskKey: key,
  timeZone,
  initial,
  onOpen,
  onClose,
}: {
  taskKey: string;
  timeZone: string;
  initial?: Detail;
  onOpen?: Open;
  onClose?: () => void;
}) {
  const query = useQuery({
    queryKey: taskKey(key),
    queryFn: () => api<Detail>(`/tasks/${key}`),
    initialData: initial,
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.statusCode === 404;
    return (
      <div className="flex flex-col gap-4 p-6">
        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label={d.close} className="self-end" onClick={onClose}>
            <X />
          </Button>
        )}
        <p className="text-sm text-muted-foreground">{missing ? d.notFound : d.loadFailed}</p>
        {!missing && (
          <Button variant="outline" className="self-start" onClick={() => query.refetch()}>
            {d.retry}
          </Button>
        )}
      </div>
    );
  }
  return <Loaded task={query.data} timeZone={timeZone} onOpen={onOpen} onClose={onClose} />;
}

function Loaded({
  task,
  timeZone,
  onOpen,
  onClose,
}: {
  task: Detail;
  timeZone: string;
  onOpen: Open;
  onClose?: () => void;
}) {
  const router = useRouter();
  const readOnly = task.project.archived;
  const edit = useEditTask(task);
  const remove = useDelete(task, () => (onClose ? onClose() : router.push(`/projects/${task.projectId}/tasks`)));

  const copyLink = () =>
    navigator.clipboard.writeText(`${location.origin}/tasks/${task.key}`).then(
      () => toast.success(d.copied),
      () => toast.error(t.saveFailed),
    );

  return (
    <>
      {/* FR-TASK-14 */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-4">
        <span className="mr-auto font-mono text-sm text-muted-foreground">{task.key}</span>
        <Button variant="ghost" size="icon-sm" aria-label={d.copyLink} onClick={copyLink}>
          <Link2 />
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label={d.openPage} asChild>
            <Link href={`/tasks/${task.key}`}>
              <Maximize2 />
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={d.more}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" disabled={readOnly || remove.isPending} onSelect={() => remove.mutate()}>
              <Trash2 />
              {d.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {onClose && (
          <Button variant="ghost" size="icon-sm" aria-label={d.close} onClick={onClose}>
            <X />
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-1">
          {task.parent && (
            <TaskLink
              taskKey={task.parent.key}
              onOpen={onOpen}
              className="flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
            >
              <CornerLeftUp aria-hidden className="size-3.5" />
              <span className="sr-only">{d.parent}</span>
              <span className="font-mono text-xs">{task.parent.key}</span>
              <span className="truncate">{task.parent.title}</span>
            </TaskLink>
          )}
          <Title key={task.title} task={task} readOnly={readOnly} onSave={(title) => edit({ title })} />
        </div>

        {/* FR-TASK-15: name/value pairs, click a value to edit it. */}
        <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-0.5 text-sm">
          <Prop name={t.fields.status}>
            <Pick
              label={t.fields.status}
              disabled={readOnly}
              value={task.status}
              options={TASK_STATUSES.map((s) => ({ value: s, text: t.status[s], icon: <StatusIcon status={s} /> }))}
              onChange={(status) => edit({ status }, statusShown(status))}
            />
          </Prop>
          <Prop name={t.fields.priority}>
            <Pick
              label={t.fields.priority}
              disabled={readOnly}
              value={task.priority}
              options={TASK_PRIORITIES.map((p) => ({ value: p, text: t.priority[p], icon: <PriorityIcon priority={p} /> }))}
              onChange={(priority) => edit({ priority })}
            />
          </Prop>
          <Prop name={t.fields.assignee}>
            <AssigneePick
              task={task}
              label={t.fields.assignee}
              disabled={readOnly}
              onChange={(a) => edit({ assigneeId: a?.id ?? null }, { assignee: a })}
            />
          </Prop>
          <Prop name={t.fields.due}>
            <DuePick task={task} label={t.fields.due} timeZone={timeZone} disabled={readOnly} onChange={(due) => edit(due)} />
          </Prop>
          <Prop name={t.fields.label}>
            <LabelsPick task={task} disabled={readOnly} onChange={(labels) => edit({ labelIds: labels.map((l) => l.id) }, { labels })} />
          </Prop>
          <Prop name={d.project}>
            <Link href={`/projects/${task.projectId}/tasks`} className="truncate py-1 hover:underline">
              {task.project.name}
            </Link>
          </Prop>
          <Prop name={d.creator}>
            <span className="flex items-center gap-2 py-1">
              <UserAvatar user={task.creator} className="size-5 text-[10px]" />
              {task.creator.name}
            </span>
          </Prop>
          <Prop name={d.created}>
            <span className="py-1 tabular-nums">
              {formatDate(task.createdAt, timeZone)} {formatTime(task.createdAt, timeZone)}
            </span>
          </Prop>
        </dl>

        <Description task={task} readOnly={readOnly} />
        {!task.parentId && <Subtasks task={task} timeZone={timeZone} readOnly={readOnly} onOpen={onOpen} />}
        <ActivityList task={task} timeZone={timeZone} />
      </div>
    </>
  );
}

function Prop({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{name}</dt>
      <dd className="flex min-w-0 items-center">{children}</dd>
    </>
  );
}

function TaskLink({
  taskKey: key,
  onOpen,
  className,
  children,
}: {
  taskKey: string;
  onOpen: Open;
  className?: string;
  children: React.ReactNode;
}) {
  if (!onOpen) {
    return (
      <Link href={`/tasks/${key}`} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(key)} className={cn("text-left", className)}>
      {children}
    </button>
  );
}

// Enter or leaving the field saves; Esc puts the old title back. Remounted (key) when the title changes.
function Title({ task, readOnly, onSave }: { task: Task; readOnly: boolean; onSave: (title: string) => void }) {
  const [value, setValue] = useState(task.title);
  const save = () => {
    const title = value.trim();
    if (title && title !== task.title) onSave(title);
    else setValue(task.title);
  };
  return (
    <textarea
      aria-label={d.title}
      rows={1}
      maxLength={200}
      readOnly={readOnly}
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/\n/g, " "))}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setValue(task.title);
          // The blur after this sees the old value, so nothing is saved.
          e.currentTarget.value = task.title;
        }
      }}
      className="-mx-1.5 resize-none rounded-md bg-transparent px-1.5 py-1 font-heading text-xl font-semibold outline-none [field-sizing:content] hover:bg-muted/50 focus:bg-muted/50"
    />
  );
}

function LabelsPick({
  task,
  disabled,
  onChange,
}: {
  task: Task;
  disabled: boolean;
  onChange: (labels: Label[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels = useQuery({ queryKey: ["labels"], queryFn: () => api<Label[]>("/labels"), enabled: open });
  const has = new Set(task.labels.map((l) => l.id));
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          size="sm"
          aria-label={t.fields.label}
          className="-ml-1.5 h-auto min-h-7 flex-wrap justify-start gap-1 px-1.5 py-1 font-normal disabled:opacity-100"
        >
          {task.labels.length ? (
            task.labels.map((l) => <LabelChip key={l.id} label={l} />)
          ) : (
            <span className="text-muted-foreground">{d.noLabels}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {(labels.data ?? task.labels).map((l) => (
          <DropdownMenuCheckboxItem
            key={l.id}
            checked={has.has(l.id)}
            // Stays open, so several labels can be ticked in a row.
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(on) =>
              onChange(
                on
                  ? [...task.labels, l].sort((a, b) => a.name.localeCompare(b.name))
                  : task.labels.filter((x) => x.id !== l.id),
              )
            }
          >
            <LabelChip label={l} />
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// FR-TASK-16: saves a second after the last keystroke, and when the panel closes.
function Description({ task, readOnly }: { task: Detail; readOnly: boolean }) {
  const qc = useQueryClient();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const pending = useRef<unknown[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { id, key } = task;
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const doc = pending.current;
    if (!doc) return;
    pending.current = null;
    setState("saving");
    api(`/tasks/${id}`, { method: "PATCH", body: { description: doc } }).then(
      () => {
        qc.setQueryData<Detail>(taskKey(key), (x) => x && { ...x, description: doc });
        void qc.invalidateQueries({ queryKey: activityKey(id) });
        setState("saved");
      },
      (e) => {
        // Kept, so the next keystroke or closing tries again.
        pending.current ??= doc;
        setState("idle");
        saveError(e);
      },
    );
  }, [qc, id, key]);
  useEffect(() => flush, [flush]);

  return (
    <section aria-label={d.description} className="flex flex-col gap-1">
      <div className="flex h-5 items-center justify-between">
        <h3 className="text-sm font-medium">{d.description}</h3>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          {state === "saving" ? d.saving : state === "saved" ? d.saved : ""}
        </span>
      </div>
      <div className="-mx-6 min-h-24">
        <TaskEditor
          initial={task.description}
          editable={!readOnly}
          onChange={(doc) => {
            pending.current = doc;
            clearTimeout(timer.current);
            timer.current = setTimeout(flush, 1000);
          }}
        />
      </div>
    </section>
  );
}

// FR-TASK-17
function Subtasks({
  task,
  timeZone,
  readOnly,
  onOpen,
}: {
  task: Detail;
  timeZone: string;
  readOnly: boolean;
  onOpen: Open;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const done = task.subtasks.filter((s) => s.status === "DONE").length;
  const create = useMutation({
    mutationFn: (title: string) =>
      api<Task>("/tasks", { method: "POST", body: { projectId: task.projectId, parentId: task.id, title } }),
    onSuccess: (sub) => {
      qc.setQueryData<Detail>(taskKey(task.key), (x) => x && { ...x, subtasks: [...x.subtasks, sub] });
      void refreshMyTasks(qc);
      setTitle("");
    },
    onError: saveError,
  });

  return (
    <section aria-label={d.subtasks} className="flex flex-col gap-1">
      <h3 className="flex h-5 items-center gap-2 text-sm font-medium">
        {d.subtasks}
        {task.subtasks.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {done}/{task.subtasks.length}
          </span>
        )}
      </h3>
      <ul className="flex flex-col">
        {task.subtasks.map((s) => (
          <Subtask key={s.id} task={s} timeZone={timeZone} readOnly={readOnly} onOpen={onOpen} />
        ))}
      </ul>
      {!readOnly && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = title.trim();
            if (value && !create.isPending) create.mutate(value);
          }}
        >
          <Plus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <Input
            aria-label={d.addSubtask}
            placeholder={d.addSubtaskPlaceholder}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 border-transparent px-1.5 shadow-none hover:border-input"
          />
        </form>
      )}
    </section>
  );
}

function Subtask({ task, timeZone, readOnly, onOpen }: { task: Task; timeZone: string; readOnly: boolean; onOpen: Open }) {
  const edit = useEditTask(task);
  return (
    <li className="flex h-9 items-center gap-2 border-b text-sm">
      <Checkbox
        aria-label={d.done(task.key)}
        checked={task.status === "DONE"}
        disabled={readOnly}
        onCheckedChange={(on) => {
          const status = on ? "DONE" : "TODO";
          edit({ status }, statusShown(status));
        }}
      />
      <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
      <TaskLink
        taskKey={task.key}
        onOpen={onOpen}
        className={cn("min-w-0 flex-1 truncate hover:underline", task.status === "DONE" && "text-muted-foreground line-through")}
      >
        {task.title}
      </TaskLink>
      <div className="flex w-32 shrink-0">
        <AssigneePick task={task} disabled={readOnly} onChange={(a) => edit({ assigneeId: a?.id ?? null }, { assignee: a })} />
      </div>
      <div className="flex w-24 shrink-0">
        <DuePick task={task} timeZone={timeZone} disabled={readOnly} onChange={(due) => edit(due)} />
      </div>
    </li>
  );
}

// FR-TASK-19: Activity tab; Comments join it in F13.
function ActivityList({ task, timeZone }: { task: Task; timeZone: string }) {
  const PAGE = 20;
  const query = useInfiniteQuery({
    queryKey: activityKey(task.id),
    queryFn: ({ pageParam }) =>
      api<{ items: Activity[]; hasMore: boolean }>(`/tasks/${task.id}/activity?offset=${pageParam}&limit=${PAGE}`),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length * PAGE : undefined),
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section aria-label={d.activity} className="flex flex-col gap-2 border-t pt-4">
      <h3 className="text-sm font-medium">{d.activity}</h3>
      {query.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : query.isError ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {d.loadFailed}
          <Button variant="link" size="sm" onClick={() => query.refetch()}>
            {d.retry}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{d.noActivity}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id} className="flex gap-2 text-sm">
              <UserAvatar user={a.actor} className="mt-0.5 size-5 text-[10px]" />
              <p className="min-w-0 flex-1">
                <span className="font-medium">{a.actor.name}</span> {describeActivity(a)}
                <time
                  dateTime={a.createdAt}
                  title={`${formatDate(a.createdAt, timeZone)} ${formatTime(a.createdAt, timeZone)}`}
                  className="ml-2 text-xs text-muted-foreground"
                >
                  {formatRelative(a.createdAt, timeZone)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      )}
      {query.hasNextPage && (
        <Button
          variant="link"
          size="sm"
          className="self-start px-0 text-muted-foreground"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {t.seeMore}
        </Button>
      )}
    </section>
  );
}

// FR-ROLE-04, FR-UI-04: to Trash at once, with Undo in the toast.
function useDelete(task: Task, onDeleted: () => void) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: tasksKey(task.projectId) });
    void qc.invalidateQueries({ queryKey: ["task"] });
    void refreshMyTasks(qc);
  };
  return useMutation({
    mutationFn: () => api(`/tasks/${task.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.setQueryData<Task[]>(tasksKey(task.projectId), (list) => list?.filter((x) => x.id !== task.id));
      qc.setQueriesData<Detail>({ queryKey: ["task"] }, (x) => x && { ...x, subtasks: x.subtasks.filter((s) => s.id !== task.id) });
      // Its subtasks go to Trash with it.
      qc.setQueryData<MyTask[]>(myTasksKey, (list) => list?.filter((x) => x.id !== task.id && x.parentId !== task.id));
      qc.removeQueries({ queryKey: taskKey(task.key) });
      onDeleted();
      toast.success(d.deleted(task.key), {
        action: {
          label: d.undo,
          onClick: () => api(`/tasks/${task.id}/restore`, { method: "POST" }).then(refresh, saveError),
        },
      });
    },
    onError: saveError,
  });
}
