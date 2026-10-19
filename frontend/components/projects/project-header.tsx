"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArchiveRestore, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { useProjectAction } from "./project-menu";

const t = strings.projects;

export function PinButton({ project }: { project: Project }) {
  const pin = useProjectAction(
    `/me/favorites/${project.id}`,
    project.pinned ? "DELETE" : "PUT",
    project.pinned ? t.unpinnedToast : t.pinnedToast,
  );
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={project.pinned ? t.menu.unpin : t.menu.pin}
      aria-pressed={project.pinned}
      disabled={pin.isPending}
      onClick={() => pin.mutate()}
    >
      <Star className={cn(project.pinned && "fill-current")} />
    </Button>
  );
}

export function ArchivedBanner({ project }: { project: Project }) {
  const restore = useProjectAction(`/projects/${project.id}/restore`, "POST", t.restoredToast);
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border bg-muted px-4 py-2 text-sm">
      <span className="flex-1">{t.archivedBanner}</span>
      <Button variant="outline" size="sm" disabled={restore.isPending} onClick={() => restore.mutate()}>
        <ArchiveRestore />
        {t.menu.restore}
      </Button>
    </div>
  );
}

export function ProjectTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${id}`, label: t.tabs.overview },
    { href: `/projects/${id}/tasks`, label: t.tabs.tasks },
    { href: `/projects/${id}/files`, label: t.tabs.files },
  ];
  return (
    <nav aria-label={t.tabs.label} className="flex gap-4 border-b">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent pb-2 text-sm text-muted-foreground hover:text-foreground",
              active && "border-primary font-medium text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
