import { describe, expect, it } from "vitest";
import { dueTone, formatDate, formatDueDate, formatRelative, formatTime } from "./format";

const TZ = "Asia/Ho_Chi_Minh"; // UTC+7

describe("formatters", () => {
  it("formats timestamps in the workspace timezone", () => {
    // 20:00 UTC on the 12th is already the 13th in Vietnam.
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
    // 23:30 on the 12th in Vietnam: only 3.5 hours ago, but yesterday.
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
