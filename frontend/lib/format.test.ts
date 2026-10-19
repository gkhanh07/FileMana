import { describe, expect, it } from "vitest";
import { dueTone, formatDate, formatDueDate, formatDueDay, formatLongDate, formatRelative, formatTime, hourIn } from "./format";

const TZ = "Asia/Ho_Chi_Minh"; // UTC+7

describe("formatters", () => {
  it("formats timestamps in the workspace timezone", () => {
    expect(formatDate("2026-10-12T20:00:00Z", TZ)).toBe("13/10/2026");
    expect(formatTime("2026-10-12T17:05:00Z", TZ)).toBe("00:05");
  });

  it("formats due dates without converting them", () => {
    expect(formatDueDate("2026-10-15")).toBe("15/10/2026");
    expect(formatDueDate("2026-10-15", "14:30")).toBe("15/10/2026 14:30");
  });

  it("uses Vietnamese relative times by calendar day", () => {
    const now = new Date("2026-10-13T03:00:00Z"); // 10:00 on the 13th in Vietnam
    expect(formatRelative("2026-10-13T02:59:30Z", TZ, now)).toBe("bây giờ");
    expect(formatRelative("2026-10-13T02:58:00Z", TZ, now)).toBe("2 phút trước");
    expect(formatRelative("2026-10-13T00:00:00Z", TZ, now)).toBe("3 giờ trước");
    expect(formatRelative("2026-10-12T16:30:00Z", TZ, now)).toBe("Hôm qua");
    expect(formatRelative("2026-10-10T03:00:00Z", TZ, now)).toBe("10/10/2026");
  });
});

describe("dueTone", () => {
  it("counts days from today in the workspace timezone", () => {
    const now = new Date("2026-10-12T20:00:00Z"); // already the 13th in Vietnam
    expect(dueTone("2026-10-12", TZ, now)).toBe("overdue");
    expect(dueTone("2026-10-13", TZ, now)).toBe("soon");
    expect(dueTone("2026-10-15", TZ, now)).toBe("soon");
    expect(dueTone("2026-10-16", TZ, now)).toBeNull();
  });
});

describe("Home dates (FR-HOME-01, FR-HOME-04)", () => {
  const now = new Date("2026-10-13T16:30:00Z");
  it("names the day relative to workspace today", () => {
    expect(formatDueDay("2026-10-12", null, TZ, now)).toBe("Hôm qua");
    expect(formatDueDay("2026-10-13", "14:30", TZ, now)).toBe("Hôm nay 14:30");
    expect(formatDueDay("2026-10-14", null, TZ, now)).toBe("Ngày mai");
    expect(formatDueDay("2026-10-16", null, TZ, now)).toBe("Thứ 6");
    expect(formatDueDay("2026-10-18", null, TZ, now)).toBe("Chủ nhật");
    expect(formatDueDay("2026-10-20", null, TZ, now)).toBe("20/10/2026");
    expect(formatDueDay("2026-10-01", null, TZ, now)).toBe("01/10/2026");
  });
  it("reads the hour and the long date in workspace time", () => {
    expect(hourIn(TZ, now)).toBe(23);
    expect(formatLongDate("2026-10-13")).toBe("Thứ 3, 13/10/2026");
  });
});
