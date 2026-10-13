"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { strings } from "@/lib/strings";
import {
  filterTasks,
  groupTasks,
  NO_FILTERS,
  sortTasks,
  TASK_PRIORITIES,
  type Label,
  type Task,
  type TaskFilters,
  type TaskGroup,
  type TaskGroupBy,
  type TaskSort,
  type TaskStatus,
  type TasksView,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { StatusIcon } from "./task-bits";
import { ROW_GRID, saveError, TaskRow, tasksKey } from "./task-row";

const t = strings.tasks;
const ALL = "all";
// FR-TASK-01..05. All tasks come in one request; grouping, filters and sort run here.
// ponytail: no checkbox column until bulk actions (F9); no comment/attachment counts until F12/F13.
export function TaskList({
  projectId,
  initialTasks,
  labels,
  timeZone,
  weekStartsOn,
  readOnly,
  initial,
  highlight,
}: {
  projectId: string;
  initialTasks: Task[];
  labels: Label[];
  timeZone: string;
  weekStartsOn: number;
  readOnly: boolean;
  initial: TasksView;
  highlight: string | null;
}) {
  const { data: tasks } = useQuery({
    queryKey: tasksKey(projectId),
    queryFn: () => api<Task[]>(`/projects/${projectId}/tasks`),
    initialData: initialTasks,
  });
  const [view, setView] = useState(initial);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  const update = (patch: Partial<TasksView>) => {
    const next = { ...view, ...patch };
    setView(next);
    const params = new URLSearchParams();
    if (next.group !== "status") params.set("group", next.group);
    if (next.sort !== "due") params.set("sort", next.sort);
    for (const [k, v] of Object.entries(next.filters)) if (v) params.set(k, v);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : location.pathname);
  };
  const setFilter = (patch: Partial<TaskFilters>) => update({ filters: { ...view.filters, ...patch } });

  useEffect(() => {
    if (highlight) document.getElementById(`task-${highlight}`)?.scrollIntoView({ block: "center" });
  }, [highlight]);

  const filtered = filterTasks(tasks, view.filters, timeZone, weekStartsOn);
  const groups = groupTasks(sortTasks(filtered, view.sort), view.group);
  const filtering = Object.values(view.filters).some(Boolean);
  // Everyone who has a task here, for the assignee filter.
  const assignees = [...new Map(tasks.flatMap((x) => (x.assignee ? [[x.assignee.id, x.assignee]] : []))).values()];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Choice
        label={t.fields.assignee}
        value={view.filters.assignee}
        onChange={(assignee) => setFilter({ assignee })}
        options={[
          ...assignees.map((p) => ({ value: p.id, text: p.name })),
          { value: "none", text: t.unassigned },
        ]}
      />
      <Choice
        label={t.fields.priority}
        value={view.filters.priority}
        onChange={(priority) => setFilter({ priority: priority as TaskFilters["priority"] })}
        options={TASK_PRIORITIES.map((p) => ({ value: p, text: t.priority[p] }))}
      />
      {labels.length > 0 && (
        <Choice
          label={t.fields.label}
          value={view.filters.label}
          onChange={(label) => setFilter({ label })}
          options={labels.map((l) => ({ value: l.id, text: l.name }))}
        />
      )}
      <Choice
        label={t.fields.due}
        value={view.filters.due}
        onChange={(due) => setFilter({ due: due as TaskFilters["due"] })}
        options={[
          { value: "overdue", text: t.filters.overdue },
          { value: "week", text: t.filters.week },
        ]}
      />
      {filtering && (
        <Button variant="ghost" size="sm" onClick={() => update({ filters: NO_FILTERS })}>
          {t.filters.clear}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Select value={view.group} onValueChange={(group) => update({ group: group as TaskGroupBy })}>
          <SelectTrigger size="sm" aria-label={t.groupBy.label}>
            <span className="text-muted-foreground">{t.groupBy.label}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">{t.groupBy.status}</SelectItem>
            <SelectItem value="assignee">{t.groupBy.assignee}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={view.sort} onValueChange={(sort) => update({ sort: sort as TaskSort })}>
          <SelectTrigger size="sm" aria-label={t.sort.label}>
            <span className="text-muted-foreground">{t.sort.label}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due">{t.sort.due}</SelectItem>
            <SelectItem value="priority">{t.sort.priority}</SelectItem>
            <SelectItem value="created">{t.sort.created}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  if (tasks.length === 0 && adding === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t.empty}</p>
        {!readOnly && (
          <Button
            onClick={() => {
              update({ group: "status" });
              setAdding("TODO");
            }}
          >
            <Plus />
            {t.addFirst}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      {filtering && filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t.noMatch}</p>
          <Button variant="outline" onClick={() => update({ filters: NO_FILTERS })}>
            {t.filters.clear}
          </Button>
        </div>
      ) : (
        <div className="border-t">
          <div
            aria-hidden
            className={cn(ROW_GRID, "h-8 items-center border-b text-xs tracking-wide text-muted-foreground uppercase")}
          >
            <span>{t.columns.key}</span>
            <span>{t.columns.title}</span>
            <span>{t.fields.status}</span>
            <span>{t.fields.priority}</span>
            <span>{t.fields.assignee}</span>
            <span>{t.fields.due}</span>
          </div>
          {groups.map((g) => {
            const open = !collapsed.has(g.key);
            const setOpen = (o: boolean) =>
              setCollapsed((s) => {
                const next = new Set(s);
                if (o) next.delete(g.key);
                else next.add(g.key);
                return next;
              });
            const name = groupName(g, view.group);
            return (
              <section key={g.key} aria-label={t.group(name, g.tasks.length)}>
                <div className="flex h-9 items-center gap-2 border-b bg-muted/40 pr-2 pl-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                    className="flex h-7 items-center gap-2 rounded-sm px-1.5 text-sm font-medium hover:bg-muted"
                  >
                    {open ? (
                      <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                    )}
                    <GroupTitle group={g} by={view.group} />
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">{g.tasks.length}</span>
                  </button>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.addTo(name)}
                      className="ml-auto text-muted-foreground"
                      onClick={() => {
                        setOpen(true);
                        setAdding(g.key);
                      }}
                    >
                      <Plus />
                    </Button>
                  )}
                </div>
                {open && (
                  <ul>
                    {g.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        timeZone={timeZone}
                        readOnly={readOnly}
                        highlight={task.key === highlight}
                      />
                    ))}
                    {!readOnly && (
                      <AddRow
                        projectId={projectId}
                        defaults={
                          view.group === "status"
                            ? { status: g.key as TaskStatus }
                            : { assigneeId: g.key === "none" ? null : g.key }
                        }
                        open={adding === g.key}
                        onOpenChange={(o) => setAdding(o ? g.key : null)}
                      />
                    )}
                    {view.group === "status" && g.key === "DONE" && !filtering && <OlderDone projectId={projectId} />}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const groupName = (g: TaskGroup, by: TaskGroupBy) =>
  by === "status" ? t.status[g.key as TaskStatus] : (g.tasks[0]?.assignee?.name ?? t.unassigned);

function GroupTitle({ group, by }: { group: TaskGroup; by: TaskGroupBy }) {
  if (by === "status") {
    return (
      <>
        <StatusIcon status={group.key as TaskStatus} />
        {t.status[group.key as TaskStatus]}
      </>
    );
  }
  const person = group.tasks[0]?.assignee;
  return person ? (
    <>
      <UserAvatar user={person} className="size-5 text-[10px]" />
      {person.name}
    </>
  ) : (
    <span className="text-muted-foreground">{t.unassigned}</span>
  );
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; text: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger size="sm" aria-label={label} className={cn(value && "border-primary")}>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t.filters.all}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// FR-TASK-05: type a title, Enter creates and keeps the row open for the next one.
function AddRow({
  projectId,
  defaults,
  open,
  onOpenChange,
}: {
  projectId: string;
  defaults: { status?: TaskStatus; assigneeId?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const create = useMutation({
    mutationFn: (title: string) => api<Task>("/tasks", { method: "POST", body: { projectId, title, ...defaults } }),
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(tasksKey(projectId), (list) => [...(list ?? []), task]);
      setTitle("");
      input.current?.focus();
    },
    onError: saveError,
  });

  if (!open) {
    return (
      <li className="border-b">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start rounded-none px-4 font-normal text-muted-foreground"
          onClick={() => onOpenChange(true)}
        >
          <Plus />
          {t.addTask}
        </Button>
      </li>
    );
  }
  return (
    <li className="border-b px-3 py-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = title.trim();
          if (value && !create.isPending) create.mutate(value);
        }}
      >
        <Input
          ref={input}
          autoFocus
          aria-label={t.addTask}
          placeholder={t.addPlaceholder}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
          onBlur={() => !title.trim() && onOpenChange(false)}
          className="h-8"
        />
      </form>
    </li>
  );
}

// The Done group shows the last 14 days; older ones load here, 50 at a time, into the same list.
function OlderDone({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const load = useMutation({
    mutationFn: () =>
      api<{ items: Task[]; hasMore: boolean }>(`/projects/${projectId}/tasks/done?offset=${offset}&limit=50`),
    onSuccess: ({ items, hasMore }) => {
      qc.setQueryData<Task[]>(tasksKey(projectId), (list = []) => {
        const seen = new Set(list.map((x) => x.id));
        return [...list, ...items.filter((x) => !seen.has(x.id))];
      });
      setOffset((o) => o + items.length);
      setHasMore(hasMore && items.length > 0);
    },
    onError: saveError,
  });
  if (!hasMore) return null;
  return (
    <li className="border-b">
      <Button
        variant="link"
        size="sm"
        className="h-9 px-4 text-muted-foreground"
        disabled={load.isPending}
        onClick={() => load.mutate()}
      >
        {offset === 0 ? t.seeAll : t.seeMore}
      </Button>
    </li>
  );
}
