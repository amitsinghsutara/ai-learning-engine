import { z } from "zod";

const envSchema = z.object({
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().trim().min(1).default("qwen3:8b"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_PATH: z.string().trim().min(1).default("./data/learning.db")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
