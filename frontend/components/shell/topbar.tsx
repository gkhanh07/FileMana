"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, FolderKanban, Plus, Search, SquareCheckBig, Upload } from "lucide-react";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { strings } from "@/lib/strings";
import { isActive, mainNav, settingsNav } from "./nav";
import { ThemeMenu } from "./theme-menu";

// FR-SHELL-04. Search (⌘K) is a placeholder until it ships; the bell waits for the Inbox (Phase 2).
// FR-SHELL-05: Create offers Project now; Task, Doc and Upload light up with their features.
export function Topbar() {
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);
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
            <DropdownMenuItem disabled>
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
        <ThemeMenu />
      </div>
    </header>
  );
}
