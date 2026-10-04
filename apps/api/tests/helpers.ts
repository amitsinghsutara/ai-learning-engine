import type { FastifyInstance } from "fastify";
import type { ZodType } from "zod";
import type { LLMProvider } from "@ale/ai";
import { openDatabase, runMigrations } from "../src/lib/db.js";
import { buildApp } from "../src/app.js";

export const RECOMMENDATION_FIXTURE = {
  primaryDifficulty: "Vowel confusion",
  focus: "/a/ vs /i/ discrimination",
  difficulty: "easy" as const,
  practiceCount: 5,
  hint: "Listen carefully to the middle sound.",
  explanation: "Errors are concentrated on short vowel substitutions.",
  confidence: 0.8
};

export const PRACTICE_FIXTURE = {
  skill: "short-vowels",
  focus: "/a/ vs /i/ discrimination",
  items: [{ target: "cat", choices: ["cat", "cit", "cut", "cot"] }]
};

export const PROGRESS_NARRATIVE_FIXTURE = {
  overallSummary: "Your child is making steady progress with spelling and phonics.",
  strengths: ["Initial consonant sounds", "Final consonant sounds"],
  practiceAreas: [
    {
      skillId: "short-vowels",
      title: "Short Vowel Sounds",
      description: "Short vowel sounds are currently more challenging.",
      suggestion: "Practice words with short /a/ and /i/ sounds."
    }
  ],
  encouragement: "Keep encouraging your child. Regular short practice sessions can help build confidence."
};

/** A deterministic fake LLMProvider: no Ollama required to run API tests. */
export class FakeLLMProvider implements LLMProvider {
  async generateText(): Promise<string> {
    return "fake response";
  }

  async generateStructured<T>(_prompt: string, schema: ZodType<T>): Promise<T> {
    const recommendation = schema.safeParse(RECOMMENDATION_FIXTURE);
    if (recommendation.success) return recommendation.data;

    const practice = schema.safeParse(PRACTICE_FIXTURE);
    if (practice.success) return practice.data;

    const progress = schema.safeParse(PROGRESS_NARRATIVE_FIXTURE);
    if (progress.success) return progress.data;

    throw new Error("FakeLLMProvider does not know how to satisfy this schema");
  }

  async checkHealth() {
    return { available: true, model: "fake-model" };
  }
}

export async function createTestApp(provider: LLMProvider = new FakeLLMProvider()): Promise<FastifyInstance> {
  const db = openDatabase(":memory:");
  runMigrations(db);
  return buildApp({ db, provider });
}
