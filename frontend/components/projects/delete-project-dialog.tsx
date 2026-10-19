import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { Project } from "@/lib/projects";
import { errorMessage, strings } from "@/lib/strings";

const t = strings.projects;

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const remove = useMutation({
    mutationFn: () => api(`/projects/${project.id}`, { method: "DELETE", body: { name: typed } }),
    onSuccess: () => {
      toast.success(t.deleted);
      onOpenChange(false);
      router.push("/projects");
      router.refresh();
    },
    onError: (e) => toast.error(errorMessage(e instanceof ApiError ? e.code : undefined)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.deleteDialog.title}</DialogTitle>
          <DialogDescription>{t.deleteDialog.message(project.name)}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            remove.mutate();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirm">{t.deleteDialog.confirmLabel}</Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.form.cancel}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={typed.trim() !== project.name || remove.isPending}
            >
              {t.deleteDialog.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
