import "server-only";
import { db } from "./db";
import { lastNDateKeys, localDateKey, periodStart, type Period } from "./time";

/** Plausibility limits for a submitted session (reps are counted client-side). */
export const WORKOUT_LIMITS = {
  maxReps: 1000,
  maxDurationSec: 2 * 60 * 60,
  /** A full squat takes well over half a second. */
  minSecondsPerRep: 0.6,
};

export type Workout = { id: number; reps: number; durationSec: number; startedAt: string };

export function saveWorkout(userId: number, input: { reps: number; durationSec: number; startedAt: string }) {
  const { lastInsertRowid } = db()
    .prepare("INSERT INTO workouts (user_id, reps, duration_sec, started_at) VALUES (?, ?, ?, ?)")
    .run(userId, input.reps, input.durationSec, input.startedAt);
  return Number(lastInsertRowid);
}

export function deleteWorkout(userId: number, workoutId: number) {
  db().prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?").run(workoutId, userId);
}

export function listWorkouts(userId: number, limit: number, offset = 0): { items: Workout[]; total: number } {
  const items = db()
    .prepare(
      `SELECT id, reps, duration_sec AS durationSec, started_at AS startedAt
         FROM workouts WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    )
    .all(userId, limit, offset) as Workout[];
  const { total } = db().prepare("SELECT COUNT(*) AS total FROM workouts WHERE user_id = ?").get(userId) as {
    total: number;
  };
  return { items, total };
}

function sinceClause(period: Period, column = "started_at"): { sql: string; params: string[] } {
  const start = periodStart(period);
  return start ? { sql: `AND ${column} >= ?`, params: [start.toISOString()] } : { sql: "", params: [] };
}

function sumReps(userId: number, period: Period): number {
  const since = sinceClause(period);
  const row = db()
    .prepare(`SELECT COALESCE(SUM(reps), 0) AS reps FROM workouts WHERE user_id = ? ${since.sql}`)
    .get(userId, ...since.params) as { reps: number };
  return row.reps;
}

export type UserSummary = {
  today: number;
  week: number;
  month: number;
  total: number;
  sessions: number;
  bestSession: number;
  streakDays: number;
  last7Days: { date: string; reps: number }[];
};

export function getUserSummary(userId: number): UserSummary {
  const overall = db()
    .prepare("SELECT COUNT(*) AS sessions, COALESCE(MAX(reps), 0) AS best FROM workouts WHERE user_id = ?")
    .get(userId) as { sessions: number; best: number };

  // Per-day totals over the last year, bucketed in the company time zone.
  const yearAgo = new Date(Date.now() - 366 * 24 * 3600 * 1000).toISOString();
  const rows = db()
    .prepare("SELECT reps, started_at FROM workouts WHERE user_id = ? AND started_at >= ?")
    .all(userId, yearAgo) as { reps: number; started_at: string }[];
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const key = localDateKey(r.started_at);
    byDay.set(key, (byDay.get(key) ?? 0) + r.reps);
  }

  // Streak: consecutive days with reps, ending today (or yesterday if today has none yet).
  const days = lastNDateKeys(366).reverse();
  let streakDays = 0;
  for (let i = byDay.has(days[0]) ? 0 : 1; i < days.length && byDay.has(days[i]); i++) streakDays++;

  return {
    today: sumReps(userId, "today"),
    week: sumReps(userId, "week"),
    month: sumReps(userId, "month"),
    total: sumReps(userId, "all"),
    sessions: overall.sessions,
    bestSession: overall.best,
    streakDays,
    last7Days: lastNDateKeys(7).map((date) => ({ date, reps: byDay.get(date) ?? 0 })),
  };
}

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  name: string;
  department: string;
  reps: number;
  sessions: number;
};

export function getLeaderboard(period: Period, limit = 100): LeaderboardEntry[] {
  const since = sinceClause(period, "w.started_at");
  const rows = db()
    .prepare(
      `SELECT u.id AS userId, u.name, u.department, SUM(w.reps) AS reps, COUNT(*) AS sessions
         FROM workouts w JOIN users u ON u.id = w.user_id
        WHERE u.active = 1 ${since.sql}
        GROUP BY u.id
        ORDER BY reps DESC, MIN(w.started_at) ASC
        LIMIT ?`,
    )
    .all(...since.params, limit) as Omit<LeaderboardEntry, "rank">[];
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export type DepartmentEntry = { department: string; reps: number; participants: number; members: number };

export function getDepartmentLeaderboard(period: Period): DepartmentEntry[] {
  const since = sinceClause(period, "w.started_at");
  return db()
    .prepare(
      `SELECT u.department,
              COALESCE(SUM(w.reps), 0) AS reps,
              COUNT(DISTINCT w.user_id) AS participants,
              COUNT(DISTINCT u.id) AS members
         FROM users u LEFT JOIN workouts w ON w.user_id = u.id ${since.sql}
        WHERE u.active = 1 AND u.department <> ''
        GROUP BY u.department
        ORDER BY reps DESC`,
    )
    .all(...since.params) as DepartmentEntry[];
}

export function getCompanyTotals(period: Period): { reps: number; participants: number; sessions: number } {
  const since = sinceClause(period);
  return db()
    .prepare(
      `SELECT COALESCE(SUM(reps), 0) AS reps, COUNT(DISTINCT user_id) AS participants, COUNT(*) AS sessions
         FROM workouts WHERE 1 = 1 ${since.sql}`,
    )
    .get(...since.params) as { reps: number; participants: number; sessions: number };
}
