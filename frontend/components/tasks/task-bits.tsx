import { Circle, CircleCheck, CircleDot, CircleEllipsis, MessageSquare, OctagonAlert, Paperclip, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { projectColorClass } from "@/components/projects/project-bits";
import { dueTone, formatDueDate } from "@/lib/format";
import { strings } from "@/lib/strings";
import type { Label, Task, TaskPriority, TaskStatus } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const statusIcon = {
  TODO: { Icon: Circle, className: "text-status-gray" },
  IN_PROGRESS: { Icon: CircleDot, className: "text-status-blue" },
  REVIEW: { Icon: CircleEllipsis, className: "text-status-blue" },
  DONE: { Icon: CircleCheck, className: "text-status-green" },
} satisfies Record<TaskStatus, unknown>;

export function StatusIcon({ status }: { status: TaskStatus }) {
  const { Icon, className } = statusIcon[status];
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} />;
}

const priorityIcon = { URGENT: OctagonAlert, HIGH: SignalHigh, MEDIUM: SignalMedium, LOW: SignalLow };

export function PriorityIcon({ priority }: { priority: TaskPriority }) {
  const Icon = priorityIcon[priority];
  return (
    <Icon
      aria-hidden
      className={cn("size-4 shrink-0", priority === "URGENT" ? "text-status-red" : "text-muted-foreground")}
    />
  );
}

export function CommentCount({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-1 tabular-nums" aria-label={strings.comments.count(count)}>
      <MessageSquare aria-hidden className="size-3" />
      {count}
    </span>
  );
}

export function AttachmentCount({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-1 tabular-nums" aria-label={strings.files.attachmentCount(count)}>
      <Paperclip aria-hidden className="size-3" />
      {count}
    </span>
  );
}

export function TaskDue({ task, timeZone }: { task: Pick<Task, "dueDate" | "dueTime" | "status">; timeZone: string }) {
  if (!task.dueDate) return null;
  const tone = task.status === "DONE" ? null : dueTone(task.dueDate, timeZone);
  return (
    <span
      className={cn("tabular-nums", tone === "overdue" && "text-status-red", tone === "soon" && "text-status-amber")}
    >
      {formatDueDate(task.dueDate, task.dueTime)}
    </span>
  );
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 text-xs text-muted-foreground">
      <span aria-hidden className={cn("size-1.5 rounded-full", projectColorClass(label.color))} />
      {label.name}
    </span>
  );
}
