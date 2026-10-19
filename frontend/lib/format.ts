const dateFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" });
const timeFormat = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const dayKey = (at: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
const relative = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

export function formatDate(iso: string, timeZone: string): string {
  return dateFormat(timeZone).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string): string {
  return timeFormat(timeZone).format(new Date(iso));
}

export function formatDueDate(date: string, time?: string | null): string {
  const [y, m, d] = date.split("-");
  return time ? `${d}/${m}/${y} ${time}` : `${d}/${m}/${y}`;
}

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

export const daysUntil = (date: string, timeZone: string, now: Date = new Date()) =>
  (Date.parse(date) - Date.parse(dayKey(now, timeZone))) / 86_400_000;

export function dueTone(date: string, timeZone: string, now: Date = new Date()): "overdue" | "soon" | null {
  const days = daysUntil(date, timeZone, now);
  return days < 0 ? "overdue" : days <= 2 ? "soon" : null;
}

const WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

export const formatLongDate = (date: string) => `${weekday(date)}, ${formatDueDate(date)}`;

export const hourIn = (timeZone: string, now: Date = new Date()) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now));

export function formatDueDay(date: string, time: string | null, timeZone: string, now: Date = new Date()): string {
  const days = daysUntil(date, timeZone, now);
  const day =
    days === -1
      ? "Hôm qua"
      : days === 0
        ? "Hôm nay"
        : days === 1
          ? "Ngày mai"
          : days > 1 && days < 7
            ? weekday(date)
            : formatDueDate(date);
  return time ? `${day} ${time}` : day;
}
