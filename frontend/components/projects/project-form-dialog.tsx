import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { PROJECT_COLORS, PROJECT_STATUSES, suggestKey, type Person, type Project } from "@/lib/projects";
import { errorMessage, strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { projectColorClass } from "./project-bits";

const t = strings.projects;

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? t.form.editTitle : t.form.createTitle}</DialogTitle>
        </DialogHeader>
        {open && <ProjectForm project={project} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(project?.name ?? "");
  const [key, setKey] = useState<string | null>(null); // null: follow the name
  const [color, setColor] = useState(
    () => project?.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
  );
  const people = useQuery({
    queryKey: ["users"],
    queryFn: () => api<Person[]>("/users"),
    enabled: !!project,
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      project
        ? api<Project>(`/projects/${project.id}`, { method: "PATCH", body })
        : api<Project>("/projects", { method: "POST", body }),
    onSuccess: (saved) => {
      toast.success(project ? t.saved : t.created);
      onDone();
      if (project) router.refresh();
      else router.push(`/projects/${saved.id}`);
    },
    onError: (e) => {
      if (!(e instanceof ApiError && e.code === "PROJECT_KEY_TAKEN")) toast.error(errorMessage(codeOf(e)));
    },
  });
  const keyTaken = codeOf(save.error) === "PROJECT_KEY_TAKEN";
  const shownKey = key ?? suggestKey(name);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const date = (field: string) => String(form.get(field) ?? "") || (project ? null : undefined);
        save.mutate({
          name,
          ...(project ? { ownerId: form.get("ownerId") || undefined } : { key: shownKey }),
          description: String(form.get("description") ?? ""),
          status: form.get("status"),
          color,
          startDate: date("startDate"),
          dueDate: date("dueDate"),
        });
      }}
    >
      <Field id="project-name" label={t.form.name}>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          autoFocus
          autoComplete="off"
        />
      </Field>
      <Field id="project-key" label={t.form.key}>
        <Input
          id="project-key"
          value={shownKey}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          disabled={!!project}
          required
          pattern="[A-Z]{2,5}"
          maxLength={5}
          autoComplete="off"
          aria-invalid={keyTaken || undefined}
          aria-describedby="project-key-hint"
          className="w-28 font-mono uppercase"
        />
        <p id="project-key-hint" className={cn("text-xs", keyTaken ? "text-destructive" : "text-muted-foreground")}>
          {keyTaken ? errorMessage("PROJECT_KEY_TAKEN") : t.form.keyHint}
        </p>
      </Field>
      <Field id="project-description" label={t.form.description}>
        <Input
          id="project-description"
          name="description"
          defaultValue={project?.description ?? ""}
          maxLength={300}
          autoComplete="off"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="project-status" label={t.form.status}>
          <Select name="status" defaultValue={project?.status ?? "PLANNING"}>
            <SelectTrigger id="project-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t.status[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {project && (
          <Field id="project-owner" label={t.form.owner}>
            <Select name="ownerId" defaultValue={project.owner.id}>
              <SelectTrigger id="project-owner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(people.data ?? [project.owner]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field id="project-start" label={t.form.startDate}>
          <Input id="project-start" name="startDate" type="date" defaultValue={project?.startDate ?? ""} />
        </Field>
        <Field id="project-due" label={t.form.dueDate}>
          <Input id="project-due" name="dueDate" type="date" defaultValue={project?.dueDate ?? ""} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">{t.form.color}</legend>
        <div className="flex gap-2">
          {PROJECT_COLORS.map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                aria-label={t.form.colorOption(i + 1)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "block size-6 rounded-sm ring-offset-2 ring-offset-popover peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4",
                  projectColorClass(c),
                )}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t.form.cancel}
        </Button>
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {project ? t.form.save : t.form.create}
        </Button>
      </DialogFooter>
    </form>
  );
}

const codeOf = (e: unknown) => (e instanceof ApiError ? e.code : undefined);

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
