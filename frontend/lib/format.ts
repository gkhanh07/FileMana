// NFR-13: dd/mm/yyyy, 24-hour time, Vietnamese relative times, read in the workspace timezone.

const dateFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" });
const timeFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
// en-CA writes yyyy-mm-dd, which makes a calendar-day key in any timezone.
const dayKey = (at: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
const relative = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

/** A timestamp from the API (ISO 8601 UTC) as "13/10/2026". */
export function formatDate(iso: string, timeZone: string): string {
  return dateFormat(timeZone).format(new Date(iso));
}

/** A timestamp from the API as "14:30". */
export function formatTime(iso: string, timeZone: string): string {
  return timeFormat(timeZone).format(new Date(iso));
}

/** A due date ("2026-10-15") with an optional time ("14:30"). Already in workspace time, so no conversion. */
export function formatDueDate(date: string, time?: string | null): string {
  const [y, m, d] = date.split("-");
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`;
}

/** "bây giờ", "2 phút trước", "3 giờ trước" (same day), "Hôm qua", then the date. */
export function formatRelative(iso: string, timeZone: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return relative.format(0, "second");
  if (minutes < 60) return relative.format(-minutes, "minute");
  const days = (Date.parse(dayKey(now, timeZone)) - Date.parse(dayKey(at, timeZone))) / 86_400_000;
  if (days === 0) return relative.format(-Math.floor(minutes / 60), "hour");
  if (days === 1) return relative.format(-1, "day");
  return formatDate(iso, timeZone);
}

/** Product rule: past the due date is "overdue" (red), 2 days or less is "soon" (amber). Today is in workspace time. */
export function dueTone(date: string, timeZone: string, now: Date = new Date()): "overdue" | "soon" | null {
  const days = (Date.parse(date) - Date.parse(dayKey(now, timeZone))) / 86_400_000;
  return days < 0 ? "overdue" : days <= 2 ? "soon" : null;
}
