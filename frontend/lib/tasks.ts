import type { components } from "./api/schema";
import { dayKey, daysUntil, dueTone, formatDueDate } from "./format";
import { strings } from "./strings";

export type Task = components["schemas"]["TaskDto"];
// FR-HOME-02, FR-MY-01: a task from a list across projects carries its project.
export type MyTask = components["schemas"]["MyTaskDto"];
export type TaskStatus = components["schemas"]["TaskStatus"];
export type TaskPriority = components["schemas"]["TaskPriority"];
export type Label = components["schemas"]["LabelDto"];
export type TaskPatch = Omit<components["schemas"]["UpdateTaskDto"], "description"> & { description?: unknown[] | null };
// JSON columns come through OpenAPI as empty objects; these are the real shapes.
export type TaskDetail = Omit<components["schemas"]["TaskDetailDto"], "description"> & { description: unknown[] | null };
export type Activity = Omit<components["schemas"]["ActivityDto"], "oldValue" | "newValue"> & {
  oldValue: unknown;
  newValue: unknown;
};

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export type TaskGroupBy = "status" | "assignee";
export type TaskSort = "due" | "priority" | "created";
/** "none" means unassigned. */
export type TaskFilters = {
  assignee: string | null;
  priority: TaskPriority | null;
  label: string | null;
  due: "overdue" | "week" | null;
};
export const NO_FILTERS: TaskFilters = { assignee: null, priority: null, label: null, due: null };

export type TasksView = { group: TaskGroupBy; sort: TaskSort; filters: TaskFilters };

/** Reads the view from the URL; anything unknown falls back to the default. */
export function parseTasksView(p: Record<string, string | undefined>): TasksView {
  return {
    group: p.group === "assignee" ? "assignee" : "status",
    sort: p.sort === "priority" || p.sort === "created" ? p.sort : "due",
    filters: {
      assignee: p.assignee ?? null,
      priority: TASK_PRIORITIES.find((x) => x === p.priority) ?? null,
      label: p.label ?? null,
      due: p.due === "overdue" || p.due === "week" ? p.due : null,
    },
  };
}

/** The first and last day ("2026-10-12") of the week containing `now`, in workspace time. */
export function weekRange(timeZone: string, weekStartsOn: number, now: Date = new Date()): [string, string] {
  const today = new Date(`${dayKey(now, timeZone)}T00:00:00Z`);
  const start = new Date(today);
  start.setUTCDate(today.getUTCDate() - ((today.getUTCDay() - weekStartsOn + 7) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

/** FR-TASK-03. Done tasks are never overdue. */
export function filterTasks(
  tasks: Task[],
  f: TaskFilters,
  timeZone: string,
  weekStartsOn: number,
  now: Date = new Date(),
): Task[] {
  const [weekStart, weekEnd] = weekRange(timeZone, weekStartsOn, now);
  return tasks.filter(
    (t) =>
      (!f.assignee || (t.assignee?.id ?? "none") === f.assignee) &&
      (!f.priority || t.priority === f.priority) &&
      (!f.label || t.labels.some((l) => l.id === f.label)) &&
      (f.due !== "overdue" ||
        (t.status !== "DONE" && !!t.dueDate && dueTone(t.dueDate, timeZone, now) === "overdue")) &&
      (f.due !== "week" || (!!t.dueDate && t.dueDate >= weekStart && t.dueDate <= weekEnd)),
  );
}

/** FR-TASK-03: nearest due first (no date last), most urgent first, or newest first. */
export function sortTasks<T extends Task>(tasks: T[], sort: TaskSort): T[] {
  const due = (t: Task) => (t.dueDate ? `${t.dueDate} ${t.dueTime ?? "99:99"}` : "9999");
  return [...tasks].sort((a, b) =>
    sort === "priority"
      ? TASK_PRIORITIES.indexOf(a.priority) - TASK_PRIORITIES.indexOf(b.priority) || a.number - b.number
      : sort === "created"
        ? b.number - a.number
        : due(a).localeCompare(due(b)) || a.number - b.number,
  );
}

export type TaskGroup = { key: string; tasks: Task[] };

/** FR-TASK-02. By status: all four, even empty, so each has its "+ Add task" row. By assignee: A–Z, unassigned last. */
export function groupTasks(tasks: Task[], by: TaskGroupBy): TaskGroup[] {
  if (by === "status") return TASK_STATUSES.map((s) => ({ key: s, tasks: tasks.filter((t) => t.status === s) }));
  const groups = new Map<string, TaskGroup & { name: string }>();
  for (const t of tasks) {
    const key = t.assignee?.id ?? "none";
    const g = groups.get(key) ?? { key, name: t.assignee?.name ?? "", tasks: [] };
    g.tasks.push(t);
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => (a.key === "none" ? 1 : b.key === "none" ? -1 : a.name.localeCompare(b.name, "vi")))
    .map(({ key, tasks }) => ({ key, tasks }));
}

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";
export const DUE_BUCKETS: DueBucket[] = ["overdue", "today", "week", "later", "none"];

/** FR-HOME-02, FR-MY-02: which due group a task falls in, by workspace "today". "week" is the next 7 days. */
export function dueBucket(dueDate: string | null, timeZone: string, now: Date = new Date()): DueBucket {
  if (!dueDate) return "none";
  const days = daysUntil(dueDate, timeZone, now);
  return days < 0 ? "overdue" : days === 0 ? "today" : days <= 7 ? "week" : "later";
}

export type MyTasksGroupBy = "due" | "project" | "status";
export type MyTaskFilters = { project: string | null; priority: TaskPriority | null; status: TaskStatus | null };
export const NO_MY_FILTERS: MyTaskFilters = { project: null, priority: null, status: null };

/** FR-MY-03, FR-MY-04: Done stays hidden unless shown, or asked for by the status filter. */
export function filterMyTasks(tasks: MyTask[], f: MyTaskFilters, showDone: boolean): MyTask[] {
  return tasks.filter(
    (t) =>
      (!f.project || t.project.id === f.project) &&
      (!f.priority || t.priority === f.priority) &&
      (!f.status || t.status === f.status) &&
      (showDone || t.status !== "DONE" || f.status === "DONE"),
  );
}

export type MyTaskGroup = { key: string; tasks: MyTask[] };

/** FR-MY-02: non-empty groups only. Due in bucket order, status in workflow order, projects A–Z. */
export function groupMyTasks(
  tasks: MyTask[],
  by: MyTasksGroupBy,
  timeZone: string,
  now: Date = new Date(),
): MyTaskGroup[] {
  const groups =
    by === "due"
      ? DUE_BUCKETS.map((b) => ({ key: b, tasks: tasks.filter((t) => dueBucket(t.dueDate, timeZone, now) === b) }))
      : by === "status"
        ? TASK_STATUSES.map((s) => ({ key: s, tasks: tasks.filter((t) => t.status === s) }))
        : [...new Map(tasks.map((t) => [t.project.id, t.project])).values()]
            .sort((a, b) => a.name.localeCompare(b.name, "vi"))
            .map((p) => ({ key: p.id, tasks: tasks.filter((t) => t.project.id === p.id) }));
  return groups.filter((g) => g.tasks.length > 0);
}

const a = strings.tasks.activity;
const dueText = (v: unknown) => {
  if (typeof v !== "string") return strings.tasks.noDue;
  const [date, time] = v.split(" ");
  return formatDueDate(date, time);
};

/** FR-ACT-02: what an Activity entry says after the actor's name. */
export function describeActivity({ action, oldValue, newValue }: Activity): string {
  const t = strings.tasks;
  switch (action) {
    case "task.created":
      return a.created;
    case "task.title":
      return a.title(String(newValue));
    case "task.status":
      return a.changed(t.fields.status, t.status[oldValue as TaskStatus], t.status[newValue as TaskStatus]);
    case "task.priority":
      return a.changed(t.fields.priority, t.priority[oldValue as TaskPriority], t.priority[newValue as TaskPriority]);
    case "task.assignee":
      return newValue ? a.assigned((newValue as { name: string }).name) : a.unassigned;
    case "task.dueDate":
      return a.changed(t.fields.due, dueText(oldValue), dueText(newValue));
    case "task.labels":
      return a.labels((newValue as string[]).join(", ") || a.noLabels);
    case "task.description":
      return a.description;
    case "task.deleted":
      return a.deleted;
    case "task.restored":
      return a.restored;
    default:
      return action;
  }
}
