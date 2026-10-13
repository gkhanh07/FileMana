"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { projectColorClass } from "@/components/projects/project-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label as FieldLabel } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { dueTone, formatDueDay } from "@/lib/format";
import { strings } from "@/lib/strings";
import {
  filterMyTasks,
  groupMyTasks,
  NO_MY_FILTERS,
  sortTasks,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type DueBucket,
  type MyTask,
  type MyTaskFilters,
  type MyTaskGroup,
  type MyTasksGroupBy,
  type TaskSort,
  type TaskStatus,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { PriorityIcon, StatusIcon } from "./task-bits";
import { TaskPanel, useOpenTask } from "./task-detail";
import { Choice } from "./task-list";
import { myTasksKey, statusShown, useUpdateTask } from "./task-row";

const t = strings.tasks;
const m = t.my;
const ROW = "grid grid-cols-[1rem_minmax(0,1fr)_10rem_7.5rem_8rem_8rem] gap-3 px-4";

const useMyTasks = (initial: MyTask[]) =>
  useQuery({ queryKey: myTasksKey, queryFn: () => api<MyTask[]>("/me/tasks"), initialData: initial }).data;

// FR-HOME-05: ticking sets Done, with Undo in the toast. Unticking goes back to Todo.
function useTick() {
  const update = useUpdateTask();
  return (task: MyTask, on: boolean) => {
    const status: TaskStatus = on ? "DONE" : "TODO";
    update.mutate({ task, patch: { status }, shown: statusShown(status) });
    if (!on) return;
    toast.success(m.done(task.key), {
      action: {
        label: t.detail.undo,
        onClick: () =>
          update.mutate({
            task: { ...task, ...statusShown("DONE") },
            patch: { status: task.status },
            shown: statusShown(task.status),
          }),
      },
    });
  };
}

// FR-HOME-02..06: my open tasks that are overdue, due today or in the next 7 days.
export function HomeTasks({ initialTasks, timeZone }: { initialTasks: MyTask[]; timeZone: string }) {
  const tasks = useMyTasks(initialTasks);
  const { openKey, openTask, closeTask } = useOpenTask();
  const tick = useTick();
  // FR-HOME-05: a task ticked here stays (struck through) until reload, so Undo has something to point at.
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const shown = tasks.filter((x) => x.status !== "DONE" || ticked.has(x.id));
  const groups = groupMyTasks(sortTasks(shown, "due"), "due", timeZone).filter((g) =>
    (["overdue", "today", "week"] as string[]).includes(g.key),
  );

  return (
    <section aria-label={strings.home.tasks} className="flex flex-col gap-3">
      {openKey && <TaskPanel taskKey={openKey} timeZone={timeZone} onOpen={openTask} onClose={closeTask} />}
      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {strings.home.empty}
        </p>
      ) : (
        <Groups
          groups={groups}
          title={(g) => m.due[g.key as DueBucket]}
          redCount={(g) => g.key === "overdue"}
          timeZone={timeZone}
          openKey={openKey}
          onOpen={openTask}
          onTick={(task, on) => {
            setTicked((s) => new Set(s).add(task.id));
            tick(task, on);
          }}
        />
      )}
      <Link href="/my-tasks" className="self-start text-sm text-muted-foreground hover:text-foreground hover:underline">
        {strings.home.allTasks}
      </Link>
    </section>
  );
}

// FR-MY-01..04: every task assigned to me, across projects.
export function MyTaskList({ initialTasks, timeZone }: { initialTasks: MyTask[]; timeZone: string }) {
  const tasks = useMyTasks(initialTasks);
  const { openKey, openTask, closeTask } = useOpenTask();
  const tick = useTick();
  const [group, setGroup] = useState<MyTasksGroupBy>("due");
  const [sort, setSort] = useState<Exclude<TaskSort, "created">>("due");
  const [filters, setFilters] = useState<MyTaskFilters>(NO_MY_FILTERS);
  const [showDone, setShowDone] = useState(false);

  const filtered = filterMyTasks(tasks, filters, showDone);
  const groups = groupMyTasks(sortTasks(filtered, sort), group, timeZone);
  const filtering = Object.values(filters).some(Boolean);
  const projects = [...new Map(tasks.map((x) => [x.project.id, x.project])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "vi"),
  );
  const setFilter = (patch: Partial<MyTaskFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      {openKey && <TaskPanel taskKey={openKey} timeZone={timeZone} onOpen={openTask} onClose={closeTask} />}
      <div className="flex flex-wrap items-center gap-2">
        <Choice
          label={m.project}
          value={filters.project}
          onChange={(project) => setFilter({ project })}
          options={projects.map((p) => ({ value: p.id, text: p.name }))}
        />
        <Choice
          label={t.fields.priority}
          value={filters.priority}
          onChange={(priority) => setFilter({ priority: priority as MyTaskFilters["priority"] })}
          options={TASK_PRIORITIES.map((p) => ({ value: p, text: t.priority[p] }))}
        />
        <Choice
          label={t.fields.status}
          value={filters.status}
          onChange={(status) => setFilter({ status: status as MyTaskFilters["status"] })}
          options={TASK_STATUSES.map((s) => ({ value: s, text: t.status[s] }))}
        />
        {filtering && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(NO_MY_FILTERS)}>
            {t.filters.clear}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-2">
            <Checkbox id="show-done" checked={showDone} onCheckedChange={(on) => setShowDone(on === true)} />
            <FieldLabel htmlFor="show-done" className="font-normal">
              {m.showDone}
            </FieldLabel>
          </span>
          <Select value={group} onValueChange={(v) => setGroup(v as MyTasksGroupBy)}>
            <SelectTrigger size="sm" aria-label={t.groupBy.label}>
              <span className="text-muted-foreground">{t.groupBy.label}:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due">{m.groupBy.due}</SelectItem>
              <SelectItem value="project">{m.groupBy.project}</SelectItem>
              <SelectItem value="status">{m.groupBy.status}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "due" | "priority")}>
            <SelectTrigger size="sm" aria-label={t.sort.label}>
              <span className="text-muted-foreground">{t.sort.label}:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due">{t.sort.due}</SelectItem>
              <SelectItem value="priority">{t.sort.priority}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            {filtering ? t.noMatch : tasks.length === 0 ? m.empty : m.allDone}
          </p>
          {filtering && (
            <Button variant="outline" onClick={() => setFilters(NO_MY_FILTERS)}>
              {t.filters.clear}
            </Button>
          )}
        </div>
      ) : (
        <Groups
          // Collapsed groups belong to one way of grouping.
          key={group}
          groups={groups}
          title={(g) =>
            group === "due" ? (
              m.due[g.key as DueBucket]
            ) : group === "status" ? (
              <>
                <StatusIcon status={g.key as TaskStatus} />
                {t.status[g.key as TaskStatus]}
              </>
            ) : (
              <ProjectName project={g.tasks[0].project} />
            )
          }
          redCount={(g) => group === "due" && g.key === "overdue"}
          timeZone={timeZone}
          openKey={openKey}
          onOpen={openTask}
          onTick={tick}
        />
      )}
    </div>
  );
}

function Groups({
  groups,
  title,
  redCount,
  timeZone,
  openKey,
  onOpen,
  onTick,
}: {
  groups: MyTaskGroup[];
  title: (g: MyTaskGroup) => React.ReactNode;
  redCount: (g: MyTaskGroup) => boolean;
  timeZone: string;
  openKey: string | null;
  onOpen: (key: string) => void;
  onTick: (task: MyTask, on: boolean) => void;
}) {
  const id = useId();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div className="border-t">
      {groups.map((g) => {
        const open = !collapsed.has(g.key);
        // FR-HOME-03: Overdue's count is red; the row background stays plain.
        const openCount = g.tasks.filter((x) => x.status !== "DONE").length;
        return (
          <section key={g.key} aria-labelledby={`${id}-${g.key}`}>
            <div className="flex h-9 items-center border-b bg-muted/40 px-2">
              <button
                type="button"
                id={`${id}-${g.key}`}
                aria-expanded={open}
                onClick={() => toggle(g.key)}
                className="flex h-7 items-center gap-2 rounded-sm px-1.5 text-sm font-medium hover:bg-muted"
              >
                {open ? (
                  <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                )}
                {title(g)}
                <span
                  className={cn(
                    "text-xs font-normal tabular-nums",
                    redCount(g) && openCount > 0 ? "font-medium text-status-red" : "text-muted-foreground",
                  )}
                >
                  {redCount(g) ? openCount : g.tasks.length}
                </span>
              </button>
            </div>
            {open && (
              <ul>
                {g.tasks.map((task) => (
                  <Row
                    key={task.id}
                    task={task}
                    timeZone={timeZone}
                    highlight={task.key === openKey}
                    onOpen={onOpen}
                    onTick={onTick}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// FR-HOME-04, FR-HOME-06: the whole row opens the panel; the title is the keyboard way in.
function Row({
  task,
  timeZone,
  highlight,
  onOpen,
  onTick,
}: {
  task: MyTask;
  timeZone: string;
  highlight: boolean;
  onOpen: (key: string) => void;
  onTick: (task: MyTask, on: boolean) => void;
}) {
  const done = task.status === "DONE";
  const tone = !done && task.dueDate ? dueTone(task.dueDate, timeZone) : null;
  return (
    <li
      onClick={() => onOpen(task.key)}
      className={cn(ROW, "h-9 cursor-pointer items-center border-b text-sm hover:bg-muted/50", highlight && "bg-accent")}
    >
      <Checkbox
        aria-label={t.detail.done(task.key)}
        checked={done}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(on) => onTick(task, on === true)}
      />
      {/* The click bubbles to the row. */}
      <button
        type="button"
        className={cn("truncate text-left hover:underline", done && "text-muted-foreground line-through")}
      >
        {task.title}
      </button>
      <ProjectName project={task.project} className="text-muted-foreground" />
      <span className="flex items-center gap-1.5">
        <PriorityIcon priority={task.priority} />
        <span className="truncate">{t.priority[task.priority]}</span>
      </span>
      <span
        className={cn(
          "truncate tabular-nums",
          tone === "overdue" && "text-status-red",
          tone === "soon" && "text-status-amber",
          !task.dueDate && "text-muted-foreground",
        )}
      >
        {task.dueDate ? formatDueDay(task.dueDate, task.dueTime, timeZone) : t.noDue}
      </span>
      <span className="flex items-center gap-1.5">
        <StatusIcon status={task.status} />
        <span className="truncate">{t.status[task.status]}</span>
      </span>
    </li>
  );
}

function ProjectName({ project, className }: { project: MyTask["project"]; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", projectColorClass(project.color))} />
      <span className="truncate">{project.name}</span>
    </span>
  );
}
