import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProjectIcon } from "@/components/projects/project-bits";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { Person, Project } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { TASK_PRIORITIES, type Task, type TaskPriority } from "@/lib/tasks";
import { PriorityIcon } from "./task-bits";
import { saveError, tasksKey, usePeople } from "./task-row";

const t = strings.tasks;
const LAST_PROJECT = "filemana.lastProject";

const readLast = () => {
  try {
    return localStorage.getItem(LAST_PROJECT);
  } catch {
    return null;
  }
};

// FR-TASK-21..23. Only the title is required; description and files come with the task page (F6/F12).
export function QuickCreateDialog({
  open,
  onOpenChange,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: Person;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t.quick.title}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from the defaults. */}
        {open && <QuickCreateForm me={me} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateForm({ me, onDone }: { me: Person; onDone: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  const people = usePeople();
  const open = projects.data?.filter((p) => !p.archivedAt) ?? [];

  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [assignee, setAssignee] = useState(me.id);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);

  // The project being viewed, else the last one used here, else the first.
  const current = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const projectId =
    [picked, current, readLast()].find((id) => id && open.some((p) => p.id === id)) ?? open[0]?.id ?? null;

  // The variable is whether the modal stays open afterwards (Shift+Enter).
  const create = useMutation<Task, unknown, boolean>({
    mutationFn: () =>
      api<Task>("/tasks", {
        method: "POST",
        body: {
          projectId,
          title: title.trim(),
          assigneeId: assignee === "none" ? null : assignee,
          priority,
          dueDate: dueDate || null,
        },
      }),
    onSuccess: (task, keepOpen) => {
      try {
        localStorage.setItem(LAST_PROJECT, task.projectId);
      } catch {}
      toast.success(t.quick.created(task.key), {
        action: {
          label: t.quick.view,
          onClick: () => router.push(`/projects/${task.projectId}/tasks?task=${task.key}`),
        },
      });
      void qc.invalidateQueries({ queryKey: tasksKey(task.projectId) });
      router.refresh();
      if (keepOpen) {
        setTitle("");
        titleInput.current?.focus();
      } else onDone();
    },
    onError: saveError,
  });
  const submit = (keepOpen: boolean) => {
    if (title.trim() && projectId && !create.isPending) create.mutate(keepOpen);
  };

  if (projects.isPending) return <Skeleton className="h-24 w-full" />;
  if (projects.isError) return <p className="text-sm text-muted-foreground">{strings.gateError.message}</p>;
  if (open.length === 0) return <p className="text-sm text-muted-foreground">{t.quick.noProjects}</p>;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <Input
        ref={titleInput}
        autoFocus
        aria-label={t.quick.titleLabel}
        placeholder={t.quick.titleLabel}
        maxLength={200}
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit(e.shiftKey);
          }
        }}
        className="h-10 text-base"
      />
      <div className="flex flex-wrap gap-2">
        <Select value={projectId ?? undefined} onValueChange={setPicked}>
          <SelectTrigger size="sm" aria-label={t.quick.project}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {open.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <ProjectIcon project={p} className="size-4 text-[9px]" />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger size="sm" aria-label={t.fields.assignee}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.unassigned}</SelectItem>
            {(people.data ?? [me]).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <UserAvatar user={p} className="size-4 text-[9px]" />
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
          <SelectTrigger size="sm" aria-label={t.fields.priority}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                <PriorityIcon priority={p} />
                {t.priority[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          aria-label={t.quick.due}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-7 w-auto text-sm"
        />
      </div>
      <DialogFooter className="items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{t.quick.hint}</p>
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          {t.quick.create}
        </Button>
      </DialogFooter>
    </form>
  );
}
