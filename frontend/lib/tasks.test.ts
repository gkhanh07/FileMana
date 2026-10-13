import { describe, expect, it } from "vitest";
import { filterTasks, groupTasks, NO_FILTERS, parseTasksView, sortTasks, weekRange, type Task } from "./tasks";

const TZ = "Asia/Ho_Chi_Minh";
// Tuesday 13/10/2026 08:00 in Hanoi.
const NOW = new Date("2026-10-13T01:00:00Z");
let n = 0;
const task = (extra: Partial<Task>) =>
  ({
    number: ++n,
    status: "TODO",
    priority: "MEDIUM",
    assignee: null,
    dueDate: null,
    dueTime: null,
    labels: [],
    ...extra,
  }) as Task;
const nums = (list: Task[]) => list.map((t) => t.number);

describe("weekRange", () => {
  it("starts on the workspace's first day of the week", () => {
    expect(weekRange(TZ, 1, NOW)).toEqual(["2026-10-12", "2026-10-18"]);
    expect(weekRange(TZ, 0, NOW)).toEqual(["2026-10-11", "2026-10-17"]);
    // Sunday night in Hanoi is still Sunday, though UTC says Sunday afternoon.
    expect(weekRange(TZ, 1, new Date("2026-10-18T16:59:00Z"))).toEqual(["2026-10-12", "2026-10-18"]);
    expect(weekRange(TZ, 1, new Date("2026-10-18T17:00:00Z"))).toEqual(["2026-10-19", "2026-10-25"]);
  });
});

describe("filterTasks", () => {
  const an = { id: "an", name: "An", avatarUrl: null };
  const bug = { id: "bug", name: "Bug", color: "red" };
  const late = task({ dueDate: "2026-10-12", assignee: an, labels: [bug] });
  const lateDone = task({ dueDate: "2026-10-12", status: "DONE" });
  const sunday = task({ dueDate: "2026-10-18", priority: "URGENT" });
  const nextWeek = task({ dueDate: "2026-10-19" });
  const all = [late, lateDone, sunday, nextWeek];
  const run = (f: Partial<typeof NO_FILTERS>) => nums(filterTasks(all, { ...NO_FILTERS, ...f }, TZ, 1, NOW));

  it("filters by assignee (or none), priority and label", () => {
    expect(run({})).toEqual(nums(all));
    expect(run({ assignee: "an" })).toEqual([late.number]);
    expect(run({ assignee: "none" })).toEqual(nums([lateDone, sunday, nextWeek]));
    expect(run({ priority: "URGENT" })).toEqual([sunday.number]);
    expect(run({ label: "bug" })).toEqual([late.number]);
  });
  it("overdue skips Done; this week follows the workspace week", () => {
    expect(run({ due: "overdue" })).toEqual([late.number]);
    expect(run({ due: "week" })).toEqual(nums([late, lateDone, sunday]));
  });
});

describe("sortTasks and groupTasks", () => {
  const a = task({ dueDate: "2026-10-20", priority: "LOW" });
  const b = task({ dueDate: "2026-10-20", dueTime: "09:00", priority: "URGENT", status: "DONE" });
  const c = task({ assignee: { id: "x", name: "Bình", avatarUrl: null } });
  const d = task({ assignee: { id: "y", name: "An", avatarUrl: null }, status: "REVIEW" });

  it("sorts by due (time first, none last), priority and newest", () => {
    expect(nums(sortTasks([c, a, b], "due"))).toEqual(nums([b, a, c]));
    expect(nums(sortTasks([a, c, b], "priority"))).toEqual(nums([b, c, a]));
    expect(nums(sortTasks([a, b, c], "created"))).toEqual(nums([c, b, a]));
  });
  it("groups by every status, or by assignee A–Z with unassigned last", () => {
    expect(groupTasks([a, b, d], "status").map((g) => [g.key, nums(g.tasks)])).toEqual([
      ["TODO", [a.number]],
      ["IN_PROGRESS", []],
      ["REVIEW", [d.number]],
      ["DONE", [b.number]],
    ]);
    expect(groupTasks([a, c, d], "assignee").map((g) => g.key)).toEqual(["y", "x", "none"]);
  });
  it("reads the view from the URL and ignores junk", () => {
    expect(parseTasksView({ group: "assignee", sort: "priority", priority: "HIGH", due: "week" })).toEqual({
      group: "assignee",
      sort: "priority",
      filters: { assignee: null, priority: "HIGH", label: null, due: "week" },
    });
    expect(parseTasksView({ group: "x", sort: "y", priority: "z", due: "w" })).toEqual({
      group: "status",
      sort: "due",
      filters: NO_FILTERS,
    });
  });
});
