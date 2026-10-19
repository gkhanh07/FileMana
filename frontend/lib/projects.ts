import type { components } from "./api/schema";

export type Project = components["schemas"]["ProjectDto"];
export type ProjectStatus = components["schemas"]["ProjectStatus"];
export type Favorite = components["schemas"]["FavoriteDto"];
export type Person = components["schemas"]["PersonDto"];
export type ProjectColor = NonNullable<components["schemas"]["CreateProjectDto"]["color"]>;

export const PROJECT_STATUSES: ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"];
export const PROJECT_COLORS: ProjectColor[] = ["blue", "teal", "green", "amber", "red", "pink", "violet", "slate"];
export const MAX_FAVORITES = 5; // the API enforces the same limit
export const ACTIVITY_PAGE = 20;

export function suggestKey(name: string): string {
  const plain = name.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "D").toUpperCase();
  const words = plain.match(/[A-Z]+/g) ?? [];
  let key = words.map((w) => w[0]).join("").slice(0, 5);
  if (key.length < 2) key = words.join("").slice(0, 3);
  return key.length >= 2 ? key : "";
}

export function runningProjects(projects: Project[], userId: string): Project[] {
  return projects
    .filter((p) => p.status === "ACTIVE" && !p.archivedAt && p.members.some((m) => m.id === userId))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))
    .slice(0, 5);
}

export type StatusFilter = "open" | ProjectStatus | "archived";
export type ProjectSort = "due" | "updated";

export function matchesStatus(p: Project, filter: StatusFilter): boolean {
  if (filter === "archived") return p.archivedAt !== null;
  if (p.archivedAt) return false;
  return filter === "open" ? p.status !== "COMPLETED" : p.status === filter;
}

export function filterProjects(projects: Project[], filter: StatusFilter, query: string, sort: ProjectSort): Project[] {
  const q = query.trim().toLocaleLowerCase("vi");
  return projects
    .filter((p) => matchesStatus(p, filter) && p.name.toLocaleLowerCase("vi").includes(q))
    .sort((a, b) =>
      sort === "updated"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
    );
}
