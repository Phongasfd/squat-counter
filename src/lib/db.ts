import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Schema migrations, applied in order. The index + 1 is stored in PRAGMA user_version.
// Append new migrations; never edit an existing one.
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT    NOT NULL,
    department    TEXT    NOT NULL DEFAULT '',
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE workouts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reps         INTEGER NOT NULL CHECK (reps > 0),
    duration_sec INTEGER NOT NULL CHECK (duration_sec > 0),
    started_at   TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX workouts_user_started ON workouts(user_id, started_at);
  CREATE INDEX workouts_started ON workouts(started_at);
  `,
];

function open(): Database.Database {
  const file = path.resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "./data/squat-counter.db");
  mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  // IMMEDIATE takes the write lock up front, so concurrent processes (e.g. build
  // workers) migrate one at a time and each re-reads the version inside the lock.
  db.transaction(() => {
    const version = db.pragma("user_version", { simple: true }) as number;
    for (let i = version; i < MIGRATIONS.length; i++) db.exec(MIGRATIONS[i]);
    if (version < MIGRATIONS.length) db.pragma(`user_version = ${MIGRATIONS.length}`);
  }).immediate();
  return db;
}

// Opened lazily on first query, and reused across hot reloads in development.
const globalForDb = globalThis as unknown as { __squatDb?: Database.Database };

export function db(): Database.Database {
  globalForDb.__squatDb ??= open();
  return globalForDb.__squatDb;
}
