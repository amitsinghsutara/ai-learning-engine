import type { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.resolve(__dirname, "../../../../database/schema.sql");

/**
 * `node:sqlite` is loaded through `require` (via `createRequire`) rather than a
 * static `import`. It's a very new Node builtin that isn't yet in Node's own
 * `builtinModules` list, which Vite/Vitest's SSR module transform relies on to
 * recognize builtins — under vite-node (as in tests) a static or dynamic import
 * of it gets misresolved as an npm package. `require` calls are plain function
 * calls that Vite's import analysis never rewrites, so this loads natively.
 */
const { DatabaseSync: DatabaseSyncCtor } = createRequire(import.meta.url)("node:sqlite") as {
  DatabaseSync: typeof DatabaseSync;
};

/** Opens (creating if needed) the SQLite database file, with foreign keys enforced. */
export function openDatabase(databasePath: string): DatabaseSync {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new DatabaseSyncCtor(databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

/** Applies database/schema.sql. Safe to run repeatedly — all statements use IF NOT EXISTS. */
export function runMigrations(db: DatabaseSync): void {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
}
