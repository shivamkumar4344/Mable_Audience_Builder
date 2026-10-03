import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const schema = `
  CREATE TABLE IF NOT EXISTS anonymous_users (
    id TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anonymous_id TEXT NOT NULL REFERENCES anonymous_users(id),
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS events_user_type_time_idx
    ON events(anonymous_id, event_type, occurred_at);
`;

export function getDatabasePath(): string {
  return process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "audience.db");
}

export function openDatabase(databasePath = getDatabasePath()): Database.Database {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  database.exec(schema);
  return database;
}
