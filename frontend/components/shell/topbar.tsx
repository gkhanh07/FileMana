"use client";

import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { isActive, mainNav, settingsNav } from "./nav";
import { ThemeMenu } from "./theme-menu";

// FR-SHELL-04. Search (⌘K) and Create (FR-SHELL-05) are placeholders until those features ship; the bell waits for the Inbox (Phase 2).
export function Topbar() {
  const pathname = usePathname();
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
        <Button disabled className="mr-2">
          <Plus />
          {strings.topbar.create}
        </Button>
        <ThemeMenu />
      </div>
    </header>
  );
}
