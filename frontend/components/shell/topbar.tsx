"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, FolderKanban, Plus, Search, SquareCheckBig, Upload } from "lucide-react";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { QuickCreateDialog } from "@/components/tasks/quick-create-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Person } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { isActive, mainNav, settingsNav } from "./nav";
import { ThemeMenu } from "./theme-menu";

// FR-SHELL-04. Search (⌘K) is a placeholder until it ships; the bell waits for the Inbox (Phase 2).
// FR-SHELL-05: Create offers Task and Project now; Doc and Upload light up with their features.
export function Topbar({ me }: { me: Person }) {
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  // FR-TASK-21: C opens quick create, unless the user is typing or another dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "c" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const el = e.target as HTMLElement;
      if (el.isContentEditable || el.closest("input, textarea, select, [role=dialog], [role=menu]")) return;
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return;
      e.preventDefault();
      setCreatingTask(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const current = [...mainNav, settingsNav].find((item) => isActive(item.href, pathname));

  return (
    <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center gap-4 border-b bg-background pr-4 pl-6">
      <nav aria-label={strings.topbar.breadcrumb} className="min-w-0 flex-1 truncate text-sm font-medium">
        {current && <span aria-current="page">{current.label}</span>}
      </nav>
      <Button variant="outline" disabled className="w-96 justify-start font-normal text-muted-foreground">
        <Search />
        <span className="flex-1 text-left">{strings.topbar.search}</span>
        <kbd className="rounded-sm border bg-background px-1.5 font-sans text-xs">⌘K</kbd>
      </Button>
      <div className="flex flex-1 items-center justify-end gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="mr-2">
              <Plus />
              {strings.topbar.create}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setCreatingTask(true)}>
              <SquareCheckBig />
              {strings.topbar.createTask}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCreating(true)}>
              <FolderKanban />
              {strings.topbar.createProject}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <FileText />
              {strings.topbar.createDoc}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Upload />
              {strings.topbar.createUpload}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ProjectFormDialog open={creating} onOpenChange={setCreating} />
        <QuickCreateDialog open={creatingTask} onOpenChange={setCreatingTask} me={me} />
        <ThemeMenu />
      </div>
    </header>
  );
}
