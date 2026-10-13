import { describe, expect, it } from "vitest";
import { filterProjects, runningProjects, suggestKey, type Project } from "./projects";

describe("suggestKey", () => {
  it("takes word initials without diacritics", () => {
    expect(suggestKey("Thiết kế web")).toBe("TKW");
    expect(suggestKey("Đào tạo nội bộ")).toBe("DTNB");
    expect(suggestKey("a b c d e f g")).toBe("ABCDE");
  });
  it("uses the first letters of a single word and gives up when there are none", () => {
    expect(suggestKey("Marketing")).toBe("MAR");
    expect(suggestKey("Web 2026")).toBe("WEB");
    expect(suggestKey("2026")).toBe("");
    expect(suggestKey("A")).toBe("");
  });
});

describe("filterProjects", () => {
  const p = (name: string, extra: Partial<Project>) =>
    ({ name, status: "ACTIVE", archivedAt: null, dueDate: null, updatedAt: "2026-10-01T00:00:00Z", ...extra }) as Project;
  const all = [
    p("Web", { dueDate: "2026-11-01", updatedAt: "2026-10-03T00:00:00Z" }),
    p("App", { dueDate: "2026-10-20" }),
    p("Xong", { status: "COMPLETED" }),
    p("Cũ", { archivedAt: "2026-10-02T00:00:00Z" }),
    p("Không hạn", { status: "PLANNING", updatedAt: "2026-10-02T00:00:00Z" }),
  ];
  const names = (list: Project[]) => list.map((x) => x.name);

  it("hides Completed and archived by default, nearest due first, no date last", () => {
    expect(names(filterProjects(all, "open", "", "due"))).toEqual(["App", "Web", "Không hạn"]);
  });
  it("filters by one status, by archived, and by name", () => {
    expect(names(filterProjects(all, "COMPLETED", "", "due"))).toEqual(["Xong"]);
    expect(names(filterProjects(all, "archived", "", "due"))).toEqual(["Cũ"]);
    expect(names(filterProjects(all, "open", "KHÔNG", "due"))).toEqual(["Không hạn"]);
  });
  it("sorts by last updated", () => {
    expect(names(filterProjects(all, "open", "", "updated"))).toEqual(["Web", "Không hạn", "App"]);
  });
});

describe("runningProjects (FR-HOME-07)", () => {
  const me = { id: "me", name: "Tâm" };
  const p = (name: string, extra: Partial<Project>) =>
    ({ name, status: "ACTIVE", archivedAt: null, dueDate: null, members: [me], ...extra }) as Project;
  it("keeps Active projects I'm in, nearest due first, at most 5", () => {
    const list = [
      p("Không hạn", {}),
      p("Gần", { dueDate: "2026-10-20" }),
      p("Xa", { dueDate: "2026-12-01" }),
      p("Tạm dừng", { status: "ON_HOLD" }),
      p("Lưu trữ", { archivedAt: "2026-10-01T00:00:00Z" }),
      p("Không có tôi", { members: [] }),
      p("A", {}),
      p("B", {}),
      p("C", {}),
    ];
    expect(runningProjects(list, "me").map((x) => x.name)).toEqual(["Gần", "Xa", "Không hạn", "A", "B"]);
  });
});
