import "dotenv/config";
import { loadEnv } from "../apps/api/src/lib/env.js";
import { openDatabase, runMigrations } from "../apps/api/src/lib/db.js";

const env = loadEnv();
const db = openDatabase(env.DATABASE_PATH);
runMigrations(db);
db.close();

console.log(`Database migrated at ${env.DATABASE_PATH}`);
