import type { components } from "./api/schema";
import type { Person } from "./projects";

export type Comment = components["schemas"]["CommentDto"];
export type CommentsPage = components["schemas"]["CommentsPageDto"];

/** Lower-case without diacritics, so "hung" finds "Hùng" and "dung" finds "Dũng"/"Đức"-style names. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

/** The @ being typed just before the caret: where it starts and what follows it. */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const m = /(?:^|\s)@([^@\n]{0,30})$/.exec(text.slice(0, caret));
  return m ? { start: caret - m[1].length - 1, query: m[1] } : null;
}

/** FR-CMT-02: project members first, then everyone else; at most 6. */
export function suggest(people: Person[], query: string, memberIds: string[]): Person[] {
  const q = fold(query);
  const members = new Set(memberIds);
  return people
    .filter((p) => fold(p.name).includes(q))
    .sort((a, b) => Number(members.has(b.id)) - Number(members.has(a.id)))
    .slice(0, 6);
}

/** Only the picked people whose "@Name" is still in the text. */
export const keptMentions = (body: string, picked: Person[]) =>
  [...new Map(picked.filter((p) => body.includes(`@${p.name}`)).map((p) => [p.id, p])).values()];

/** The body cut into plain text and "@Name" pieces for the people it mentions. */
export function splitMentions(body: string, mentions: Person[]): { text: string; person?: Person }[] {
  if (!mentions.length) return [{ text: body }];
  // Longest first, so "@Lan Anh" wins over "@Lan".
  const byName = new Map(mentions.map((p) => [`@${p.name}`, p]));
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return body
    .split(new RegExp(`(${escaped.join("|")})`, "g"))
    .filter(Boolean)
    .map((text) => ({ text, person: byName.get(text) }));
}
