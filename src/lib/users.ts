import "server-only";
import { db } from "./db";

export type Role = "admin" | "member";

export type User = {
  id: number;
  email: string;
  name: string;
  department: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

type UserRow = {
  id: number;
  email: string;
  name: string;
  department: string;
  role: Role;
  active: number;
  created_at: string;
};

const toUser = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  department: r.department,
  role: r.role,
  active: r.active === 1,
  createdAt: r.created_at,
});

const USER_COLUMNS = "id, email, name, department, role, active, created_at";

export function findUserById(id: number): User | null {
  const row = db().prepare(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function findUserWithPasswordByEmail(email: string): (User & { passwordHash: string }) | null {
  const row = db()
    .prepare(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`)
    .get(email) as (UserRow & { password_hash: string }) | undefined;
  return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
}

/** Creates a user. The very first account becomes an admin. Returns null if the email is taken. */
export function createUser(input: {
  email: string;
  name: string;
  department: string;
  passwordHash: string;
}): User | null {
  return db().transaction(() => {
    if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(input.email)) return null;
    const isFirst = !db().prepare("SELECT 1 FROM users LIMIT 1").get();
    const { lastInsertRowid } = db()
    .prepare("INSERT INTO users (email, name, department, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .run(input.email, input.name, input.department, input.passwordHash, isFirst ? "admin" : "member");
    return findUserById(Number(lastInsertRowid));
  }).immediate();
}

export type UserWithTotals = User & { totalReps: number; lastWorkoutAt: string | null };

export function listUsersWithTotals(): UserWithTotals[] {
  const rows = db()
    .prepare(
      `SELECT u.id, u.email, u.name, u.department, u.role, u.active, u.created_at,
              COALESCE(SUM(w.reps), 0) AS total_reps, MAX(w.started_at) AS last_workout_at
         FROM users u LEFT JOIN workouts w ON w.user_id = u.id
        GROUP BY u.id
        ORDER BY u.name COLLATE NOCASE`,
    )
    .all() as (UserRow & { total_reps: number; last_workout_at: string | null })[];
  return rows.map((r) => ({ ...toUser(r), totalReps: r.total_reps, lastWorkoutAt: r.last_workout_at }));
}

export function setUserRole(id: number, role: Role) {
  db().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
}

export function setUserActive(id: number, active: boolean) {
  db().prepare("UPDATE users SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
}

export function updateProfile(id: number, input: { name: string; department: string }) {
  db().prepare("UPDATE users SET name = ?, department = ? WHERE id = ?").run(input.name, input.department, id);
}

export function listDepartments(): string[] {
  const rows = db()
    .prepare("SELECT DISTINCT department FROM users WHERE department <> '' ORDER BY department COLLATE NOCASE")
    .all() as { department: string }[];
  return rows.map((r) => r.department);
}
