import type { components } from "./api/schema";
import type { Person } from "./projects";

type S = components["schemas"];
export type SearchResult = S["SearchResultDto"];

export type Hit =
  | { type: "task"; data: S["SearchTaskDto"] }
  | { type: "project"; data: S["SearchProjectDto"] }
  | { type: "item"; data: S["SearchItemDto"] }
  | { type: "member"; data: Person };

export const hitKey = (h: Hit) => `${h.type}:${h.data.id}`;

export function hitHref(h: Hit): string {
  switch (h.type) {
    case "task":
      return `/tasks/${h.data.key}`;
    case "project":
      return `/projects/${h.data.id}`;
    case "item":
      return `/docs/${h.data.id}`;
    case "member":
      return "/members";
  }
}

export const toHits = (r: SearchResult): Hit[] => [
  ...r.tasks.map((data) => ({ type: "task" as const, data })),
  ...r.projects.map((data) => ({ type: "project" as const, data })),
  ...r.items.map((data) => ({ type: "item" as const, data })),
  ...r.members.map((data) => ({ type: "member" as const, data })),
];

export const pushRecent = (list: Hit[], hit: Hit): Hit[] =>
  [hit, ...list.filter((h) => hitKey(h) !== hitKey(hit))].slice(0, 6);
