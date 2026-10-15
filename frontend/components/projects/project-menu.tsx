"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Ellipsis, Pencil, Star, StarOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import type { Project } from "@/lib/projects";
import { errorMessage, strings } from "@/lib/strings";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectFormDialog } from "./project-form-dialog";

const t = strings.projects;

/** One project action: toast and re-render the server data on success. */
export function useProjectAction(path: string, method: "POST" | "PUT" | "DELETE", success: string) {
  const router = useRouter();
  return useMutation({
    mutationFn: () => api(path, { method }),
    onSuccess: () => {
      toast.success(success);
      router.refresh();
    },
    onError: (e) => toast.error(errorMessage(e instanceof ApiError ? e.code : undefined)),
  });
}

// FR-PRJ-05 "…" menu: edit, pin, archive (FR-PRJ-10), delete (FR-PRJ-11).
export function ProjectMenu({ project }: { project: Project }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const archived = project.archivedAt !== null;
  const pin = useProjectAction(
    `/me/favorites/${project.id}`,
    project.pinned ? "DELETE" : "PUT",
    project.pinned ? t.unpinnedToast : t.pinnedToast,
  );
  const archive = useProjectAction(
    `/projects/${project.id}/${archived ? "restore" : "archive"}`,
    "POST",
    archived ? t.restoredToast : t.archivedToast,
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`${t.menu.label}: ${project.name}`}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled={archived} onSelect={() => setDialog("edit")}>
            <Pencil />
            {t.menu.edit}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={pin.isPending} onSelect={() => pin.mutate()}>
            {project.pinned ? <StarOff /> : <Star />}
            {project.pinned ? t.menu.unpin : t.menu.pin}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={archive.isPending} onSelect={() => archive.mutate()}>
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? t.menu.restore : t.menu.archive}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            <Trash2 />
            {t.menu.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectFormDialog project={project} open={dialog === "edit"} onOpenChange={(o) => setDialog(o ? "edit" : null)} />
      <DeleteProjectDialog
        project={project}
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
      />
    </>
  );
}
