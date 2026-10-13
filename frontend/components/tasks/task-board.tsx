"use client";

import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { UserAvatar } from "@/components/shell/user-avatar";
import { strings } from "@/lib/strings";
import {
  boardColumns,
  positionBetween,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { LabelChip, PriorityIcon, StatusIcon, TaskDue } from "./task-bits";
import { AddRow, OlderDone } from "./task-list";
import { statusShown, useUpdateTask } from "./task-row";

const t = strings.tasks;
type Columns = Record<TaskStatus, string[]>;

// FR-TASK-07..11: the same filtered tasks as the list, in four status columns.
export function TaskBoard({
  projectId,
  tasks,
  timeZone,
  readOnly,
  openKey,
  onOpen,
  adding,
  onAddingChange,
  showOlderDone,
}: {
  projectId: string;
  tasks: Task[];
  timeZone: string;
  readOnly: boolean;
  openKey: string | null;
  onOpen: (key: string) => void;
  adding: string | null;
  onAddingChange: (status: string | null) => void;
  showOlderDone: boolean;
}) {
  const update = useUpdateTask();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const byId = new Map(tasks.map((x) => [x.id, x]));
  const saved = Object.fromEntries(
    boardColumns(tasks).map((g) => [g.key, g.tasks.map((x) => x.id)]),
  ) as Columns;
  // While a card is dragged, the columns follow the pointer; the cache changes only on drop.
  const [drag, setDrag] = useState<{ id: string; columns: Columns } | null>(
    null,
  );
  const columns = drag?.columns ?? saved;

  const columnOf = (cols: Columns, id: UniqueIdentifier) =>
    TASK_STATUSES.find((s) => s === id) ??
    TASK_STATUSES.find((s) => cols[s].includes(String(id)));

  // A card that crosses into another column moves there at once, so its placeholder shows where it will land.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!drag || !over) return;
    const from = columnOf(drag.columns, active.id);
    const to = columnOf(drag.columns, over.id);
    if (!from || !to || from === to) return;
    const target = drag.columns[to];
    const at = target.indexOf(String(over.id));
    setDrag({
      ...drag,
      columns: {
        ...drag.columns,
        [from]: drag.columns[from].filter((id) => id !== active.id),
        [to]: [
          ...target.slice(0, at < 0 ? target.length : at),
          drag.id,
          ...target.slice(at < 0 ? target.length : at),
        ],
      },
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const cols = drag?.columns;
    setDrag(null);
    const task = byId.get(String(active.id));
    const to = cols && over && columnOf(cols, over.id);
    if (!task || !cols || !to) return;
    const list = cols[to];
    const order =
      over.id === to
        ? list
        : arrayMove(list, list.indexOf(task.id), list.indexOf(String(over.id)));
    const i = order.indexOf(task.id);
    if (to === task.status && saved[to].indexOf(task.id) === i) return;
    const position = positionBetween(
      byId.get(order[i - 1])?.position,
      byId.get(order[i + 1])?.position,
    );
    const statusPatch = to === task.status ? {} : { status: to };
    update.mutate({
      task,
      patch: { ...statusPatch, position },
      shown: { ...(to === task.status ? {} : statusShown(to)), position },
    });
  };

  const dragged = drag && byId.get(drag.id);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) =>
        setDrag({ id: String(active.id), columns: saved })
      }
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDrag(null)}
    >
      <div className="grid grid-cols-4 items-start gap-3">
        {TASK_STATUSES.map((status) => (
          <Column key={status} status={status} count={columns[status].length}>
            <SortableContext
              items={columns[status]}
              strategy={verticalListSortingStrategy}
            >
              {columns[status].map((id) => {
                const task = byId.get(id);
                return (
                  task && (
                    <SortableCard
                      key={id}
                      task={task}
                      timeZone={timeZone}
                      disabled={readOnly}
                      highlight={task.key === openKey}
                      onOpen={onOpen}
                    />
                  )
                );
              })}
            </SortableContext>
            {!readOnly && (
              <AddRow
                projectId={projectId}
                defaults={{ status }}
                open={adding === status}
                onOpenChange={(o) => onAddingChange(o ? status : null)}
                className="border-none [&>*]:px-2"
              />
            )}
            {status === "DONE" && showOlderDone && (
              <OlderDone projectId={projectId} className="border-none" />
            )}
          </Column>
        ))}
      </div>
      <DragOverlay>
        {dragged && (
          <Card
            task={dragged}
            timeZone={timeZone}
            className="cursor-grabbing shadow-lg"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  count,
  children,
}: {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}) {
  // Lets a card drop into an empty column.
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <section
      aria-label={t.group(t.status[status], count)}
      className="flex min-w-0 flex-col rounded-md border bg-muted/40"
    >
      <h2 className="flex h-9 items-center gap-2 px-3 text-sm font-medium">
        <StatusIcon status={status} />
        {t.status[status]}
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {count}
        </span>
      </h2>
      <ul ref={setNodeRef} className="flex min-h-12 flex-col gap-2 px-2 pb-2">
        {children}
      </ul>
    </section>
  );
}

function SortableCard({
  task,
  timeZone,
  disabled,
  highlight,
  onOpen,
}: {
  task: Task;
  timeZone: string;
  disabled: boolean;
  highlight: boolean;
  onOpen: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
  });
  return (
    <li
      ref={setNodeRef}
      id={`task-${task.key}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={task.title}
      className="rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {/* FR-TASK-09: the card's own spot is the drop placeholder while it is dragged. */}
      <Card
        task={task}
        timeZone={timeZone}
        onOpen={onOpen}
        className={cn(
          !disabled && "cursor-grab",
          highlight && "border-primary",
          isDragging && "border-dashed bg-transparent [&>*]:invisible",
        )}
      />
    </li>
  );
}

// FR-TASK-08. ponytail: no comment/file counts until comments (F12) and attachments (F13) exist.
function Card({
  task,
  timeZone,
  onOpen,
  className,
}: {
  task: Task;
  timeZone: string;
  onOpen?: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border bg-background p-2.5 text-sm",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onOpen?.(task.key)}
        className={cn(
          "line-clamp-2 text-left hover:underline",
          task.status === "DONE" && "text-muted-foreground",
        )}
      >
        {task.title}
      </button>
      {task.labels.length > 0 && (
        <div className="flex min-w-0 gap-1 overflow-hidden">
          {task.labels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{task.key}</span>
        <span className="sr-only">
          {t.fields.priority}: {t.priority[task.priority]}
        </span>
        <PriorityIcon priority={task.priority} />
        <TaskDue task={task} timeZone={timeZone} />
        {task.assignee && (
          <UserAvatar
            user={task.assignee}
            className="ml-auto size-5 text-[10px]"
          />
        )}
      </div>
    </div>
  );
}
