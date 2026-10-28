// Calendar helpers in the company's time zone. Timestamps are stored as UTC ISO strings;
// "today", "this week" and "this month" are computed in APP_TIMEZONE.

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

export type Period = "today" | "week" | "month" | "all";
export const PERIODS: Period[] = ["today", "week", "month", "all"];
export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  all: "Tất cả",
};

export function parsePeriod(value: unknown, fallback: Period = "week"): Period {
  return PERIODS.includes(value as Period) ? (value as Period) : fallback;
}

type Ymd = { y: number; m: number; d: number };

function wallClock(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") };
}

/** Offset of `tz` from UTC at `date`, in milliseconds. */
function offsetMs(date: Date, tz: string): number {
  const w = wallClock(date, tz);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s) - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight on the given calendar day. */
function localMidnight({ y, m, d }: Ymd, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d);
  const first = guess - offsetMs(new Date(guess), tz);
  // Recompute once in case a DST change happens between the guess and the result.
  return new Date(guess - offsetMs(new Date(first), tz));
}

function addDays({ y, m, d }: Ymd, days: number): Ymd {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export function localYmd(date: Date, tz = APP_TIMEZONE): Ymd {
  const { y, m, d } = wallClock(date, tz);
  return { y, m, d };
}

/** "YYYY-MM-DD" of the given instant in the company time zone. */
export function localDateKey(date: Date | string, tz = APP_TIMEZONE): string {
  const { y, m, d } = localYmd(new Date(date), tz);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Start of the period as a UTC instant (weeks start on Monday). Null for "all". */
export function periodStart(period: Period, now = new Date(), tz = APP_TIMEZONE): Date | null {
  const today = localYmd(now, tz);
  switch (period) {
    case "today":
      return localMidnight(today, tz);
    case "week": {
      const weekday = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay(); // 0 = Sunday
      return localMidnight(addDays(today, -((weekday + 6) % 7)), tz);
    }
    case "month":
      return localMidnight({ ...today, d: 1 }, tz);
    case "all":
      return null;
  }
}

/** Date keys for the last `n` days, oldest first, ending today. */
export function lastNDateKeys(n: number, now = new Date(), tz = APP_TIMEZONE): string[] {
  const today = localYmd(now, tz);
  return Array.from({ length: n }, (_, i) => {
    const { y, m, d } = addDays(today, i - (n - 1));
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });
}

export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDateTime(iso: string, tz = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
