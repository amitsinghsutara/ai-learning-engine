import "dotenv/config";
import { OllamaProvider } from "@ale/ai";
import { loadEnv } from "./lib/env.js";
import { openDatabase, runMigrations } from "./lib/db.js";
import { buildApp } from "./app.js";

const env = loadEnv();

const db = openDatabase(env.DATABASE_PATH);
runMigrations(db);

const provider = new OllamaProvider({ baseUrl: env.OLLAMA_BASE_URL, model: env.OLLAMA_MODEL });

const app = buildApp({ db, provider, logger: true });

app
  .listen({ port: env.PORT })
  .then(() => {
    app.log.info(`AI Learning Engine API listening on port ${env.PORT}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
