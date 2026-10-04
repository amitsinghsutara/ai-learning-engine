import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { CreateLearnerInput, Learner } from "@ale/shared";

interface LearnerRow {
  id: string;
  display_name: string | null;
  age: number | null;
  created_at: string;
  updated_at: string;
}

function rowToLearner(row: LearnerRow): Learner {
  return {
    id: row.id,
    displayName: row.display_name ?? undefined,
    age: row.age ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class LearnerService {
  constructor(private readonly db: DatabaseSync) {}

  createLearner(input: CreateLearnerInput): Learner {
    const now = new Date().toISOString();
    const learner: Learner = {
      id: randomUUID(),
      displayName: input.displayName,
      age: input.age,
      createdAt: now,
      updatedAt: now
    };

    this.db
      .prepare(
        `INSERT INTO learners (id, display_name, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      )
      .run(learner.id, learner.displayName ?? null, learner.age ?? null, learner.createdAt, learner.updatedAt);

    return learner;
  }

  getLearner(id: string): Learner | null {
    const row = this.db.prepare(`SELECT * FROM learners WHERE id = ?`).get(id) as LearnerRow | undefined;
    return row ? rowToLearner(row) : null;
  }

  /**
   * Returns the learner with this exact id, creating one if it doesn't exist yet.
   * Used by client-driven ingestion (e.g. a game that generates and persists its
   * own anonymous learner id locally, then starts sending events for it without
   * ever calling `POST /learners` first).
   */
  ensureLearner(id: string): Learner {
    const existing = this.getLearner(id);
    if (existing) return existing;

    const now = new Date().toISOString();
    const learner: Learner = { id, createdAt: now, updatedAt: now };

    this.db
      .prepare(`INSERT INTO learners (id, display_name, age, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(learner.id, null, null, learner.createdAt, learner.updatedAt);

    return learner;
  }
}
