import { UserAvatar } from "@/components/shell/user-avatar";
import { dueTone, formatDueDate } from "@/lib/format";
import type { Person, Project, ProjectStatus } from "@/lib/projects";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const t = strings.projects;

// Literal class names, so Tailwind generates them.
const colorClass: Record<string, string> = {
  blue: "bg-project-blue",
  teal: "bg-project-teal",
  green: "bg-project-green",
  amber: "bg-project-amber",
  red: "bg-project-red",
  pink: "bg-project-pink",
  violet: "bg-project-violet",
  slate: "bg-project-slate",
};
export const projectColorClass = (color: string) => colorClass[color] ?? colorClass.slate;

const borderClass: Record<string, string> = {
  blue: "border-l-project-blue",
  teal: "border-l-project-teal",
  green: "border-l-project-green",
  amber: "border-l-project-amber",
  red: "border-l-project-red",
  pink: "border-l-project-pink",
  violet: "border-l-project-violet",
  slate: "border-l-project-slate",
};
export const projectBorderClass = (color: string) => borderClass[color] ?? borderClass.slate;

// FR-PRJ-01: a colored square with the name's first letter.
export function ProjectIcon({
  project,
  className,
}: {
  project: { name: string; color: string };
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-sm font-heading text-xs font-semibold text-project-foreground",
        projectColorClass(project.color),
        className,
      )}
    >
      {project.name.charAt(0).toUpperCase()}
    </span>
  );
}

const statusDot: Record<ProjectStatus, string> = {
  PLANNING: "bg-status-gray",
  ACTIVE: "bg-status-blue",
  ON_HOLD: "bg-status-amber",
  COMPLETED: "bg-status-green",
};

const statusTint: Record<ProjectStatus, string> = {
  PLANNING: "bg-status-gray/12",
  ACTIVE: "bg-status-blue/12",
  ON_HOLD: "bg-status-amber/12",
  COMPLETED: "bg-status-green/12",
};

// Product rules: a badge with a dot and a text label; Archived is gray.
export function ProjectStatusBadge({ project }: { project: Pick<Project, "status" | "archivedAt"> }) {
  const archived = project.archivedAt !== null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-sm whitespace-nowrap",
        archived ? statusTint.PLANNING : statusTint[project.status],
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", archived ? "bg-status-gray" : statusDot[project.status])}
      />
      {archived ? t.archived : t.status[project.status]}
    </span>
  );
}

// Due soon amber, overdue red; a finished project's date is just a date.
export function ProjectDue({ project, timeZone }: { project: Project; timeZone: string }) {
  if (!project.dueDate) return null;
  const tone = project.status === "COMPLETED" ? null : dueTone(project.dueDate, timeZone);
  return (
    <span
      className={cn(
        "text-sm tabular-nums",
        tone === "overdue" && "text-status-red",
        tone === "soon" && "text-status-amber",
      )}
    >
      {formatDueDate(project.dueDate)}
    </span>
  );
}

export function MemberStack({ people, max = 4 }: { people: Person[]; max?: number }) {
  const more = people.length - max;
  return (
    <span className="flex items-center">
      {people.slice(0, max).map((p) => (
        <span key={p.id} title={p.name} className="-mr-1.5 rounded-full ring-2 ring-background">
          <UserAvatar user={p} className="size-6 text-xs" />
        </span>
      ))}
      {more > 0 && <span className="ml-3 text-xs text-muted-foreground">{t.members.more(more)}</span>}
    </span>
  );
}
