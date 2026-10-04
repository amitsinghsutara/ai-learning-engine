import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { CreateLearningEventInput, LearningEvent } from "@ale/shared";

interface LearningEventRow {
  id: string;
  learner_id: string;
  skill: string;
  target: string;
  selected_answer: string | null;
  correct: number;
  foil_type: string | null;
  difficulty: string | null;
  response_time_ms: number | null;
  attempt_number: number | null;
  timestamp: string;
}

function rowToEvent(row: LearningEventRow): LearningEvent {
  return {
    id: row.id,
    learnerId: row.learner_id,
    skill: row.skill,
    target: row.target,
    selectedAnswer: row.selected_answer ?? undefined,
    correct: row.correct === 1,
    foilType: row.foil_type ?? undefined,
    difficulty: row.difficulty ?? undefined,
    responseTimeMs: row.response_time_ms ?? undefined,
    attemptNumber: row.attempt_number ?? undefined,
    timestamp: row.timestamp
  };
}

export class EventService {
  constructor(private readonly db: DatabaseSync) {}

  createEvent(learnerId: string, input: CreateLearningEventInput): LearningEvent {
    const event: LearningEvent = {
      id: randomUUID(),
      learnerId,
      skill: input.skill,
      target: input.target,
      selectedAnswer: input.selectedAnswer,
      correct: input.correct,
      foilType: input.foilType,
      difficulty: input.difficulty,
      responseTimeMs: input.responseTimeMs,
      attemptNumber: input.attemptNumber,
      timestamp: input.timestamp ?? new Date().toISOString()
    };

    this.db
      .prepare(
        `INSERT INTO learning_events
          (id, learner_id, skill, target, selected_answer, correct, foil_type, difficulty, response_time_ms, attempt_number, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.learnerId,
        event.skill,
        event.target,
        event.selectedAnswer ?? null,
        event.correct ? 1 : 0,
        event.foilType ?? null,
        event.difficulty ?? null,
        event.responseTimeMs ?? null,
        event.attemptNumber ?? null,
        event.timestamp
      );

    return event;
  }

  listEventsForLearner(learnerId: string): LearningEvent[] {
    const rows = this.db
      .prepare(`SELECT * FROM learning_events WHERE learner_id = ? ORDER BY timestamp ASC`)
      .all(learnerId) as unknown as LearningEventRow[];
    return rows.map(rowToEvent);
  }
}
