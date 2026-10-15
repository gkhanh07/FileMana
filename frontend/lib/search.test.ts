import { describe, expect, it } from "vitest";
import { hitHref, pushRecent, type Hit } from "./search";

const member = (id: string): Hit => ({ type: "member", data: { id, name: id, avatarUrl: null } });

describe("pushRecent", () => {
  it("puts the newest first, drops repeats and keeps 6", () => {
    let list: Hit[] = [];
    for (const id of ["a", "b", "c", "d", "e", "f", "g", "b"]) list = pushRecent(list, member(id));
    expect(list.map((h) => h.data.id)).toEqual(["b", "g", "f", "e", "d", "c"]);
  });
});

describe("hitHref", () => {
  it("opens a task by its key", () => {
    const hit: Hit = { type: "task", data: { id: "1", key: "WEB-12", title: "", status: "TODO", project: "", updatedAt: "" } };
    expect(hitHref(hit)).toBe("/tasks/WEB-12");
  });
});
