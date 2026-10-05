import { z } from "zod";

const envSchema = z
  .object({
    PROVIDER: z.enum(["ollama", "gemini"]).default("ollama"),
    OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().trim().min(1).default("qwen3:8b"),
    GEMINI_API_KEY: z.string().trim().min(1).optional(),
    GEMINI_MODEL: z.string().trim().min(1).default("gemini-flash-lite-latest"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_PATH: z.string().trim().min(1).default("./data/learning.db")
  })
  .refine((env) => env.PROVIDER !== "gemini" || !!env.GEMINI_API_KEY, {
    message: "GEMINI_API_KEY is required when PROVIDER is set to \"gemini\".",
    path: ["GEMINI_API_KEY"]
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
