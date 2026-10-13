"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { UserAvatar } from "@/components/shell/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  filterProjects,
  matchesStatus,
  PROJECT_STATUSES,
  type Project,
  type ProjectSort,
  type StatusFilter,
} from "@/lib/projects";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { MemberStack, ProjectDue, ProjectIcon, ProjectStatusBadge } from "./project-bits";
import { ProjectMenu } from "./project-menu";

const t = strings.projects;
const FILTERS: StatusFilter[] = ["open", ...PROJECT_STATUSES, "archived"];
export type ProjectsView = { status: StatusFilter; q: string; sort: ProjectSort };

// FR-PRJ-01/02/04. Filtering runs on the client; the view lives in the URL without refetching.
export function ProjectsTable({
  projects,
  timeZone,
  initial,
}: {
  projects: Project[];
  timeZone: string;
  initial: ProjectsView;
}) {
  const [view, setView] = useState(initial);
  const update = (patch: Partial<ProjectsView>) => {
    const next = { ...view, ...patch };
    setView(next);
    const params = new URLSearchParams();
    if (next.status !== "open") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.sort !== "due") params.set("sort", next.sort);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : location.pathname);
  };
  const rows = filterProjects(projects, view.status, view.q, view.sort);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t.columns.status} className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f}
              variant={view.status === f ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={view.status === f}
              onClick={() => update({ status: f })}
            >
              {t.filters[f]}
              <span className="text-muted-foreground tabular-nums">
                {projects.filter((p) => matchesStatus(p, f)).length}
              </span>
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label={t.search}
              placeholder={t.search}
              value={view.q}
              onChange={(e) => update({ q: e.target.value })}
              className="w-56 pl-8"
            />
          </div>
          <Select value={view.sort} onValueChange={(sort) => update({ sort: sort as ProjectSort })}>
            <SelectTrigger aria-label={t.sort.label} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="due">{t.sort.due}</SelectItem>
              <SelectItem value="updated">{t.sort.updated}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {projects.length === 0 ? (
            t.empty
          ) : (
            <>
              {t.noMatch}
              <Button variant="outline" size="sm" onClick={() => update({ status: "open", q: "" })}>
                {t.clearFilters}
              </Button>
            </>
          )}
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="h-8 border-b">
              <th className="font-medium">{t.columns.name}</th>
              <th className="w-44 font-medium">{t.columns.owner}</th>
              <th className="w-28 font-medium">{t.columns.due}</th>
              <th className="w-40 font-medium">{t.columns.progress}</th>
              <th className="w-32 font-medium">{t.columns.members}</th>
              <th className="w-32 font-medium">{t.columns.status}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="h-9 border-b hover:bg-muted/50">
                <td>
                  <Link
                    href={`/projects/${p.id}`}
                    className={cn("flex items-center gap-2 font-medium hover:underline", p.archivedAt && "text-muted-foreground")}
                  >
                    <ProjectIcon project={p} />
                    <span className="truncate">{p.name}</span>
                    <span className="font-mono text-xs font-normal text-muted-foreground">{p.key}</span>
                  </Link>
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    <UserAvatar user={p.owner} />
                    <span className="truncate">{p.owner.name}</span>
                  </span>
                </td>
                <td>
                  <ProjectDue project={p} timeZone={timeZone} />
                </td>
                <td>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full bg-primary"
                        style={{ width: `${p.taskCount ? (p.doneCount / p.taskCount) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {t.progress(p.doneCount, p.taskCount)}
                    </span>
                  </span>
                </td>
                <td>
                  <MemberStack people={p.members} />
                </td>
                <td>
                  <ProjectStatusBadge project={p} />
                </td>
                <td className="text-right">
                  <ProjectMenu project={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
