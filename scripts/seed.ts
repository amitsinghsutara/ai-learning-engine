import "dotenv/config";
import { loadEnv } from "../apps/api/src/lib/env.js";
import { openDatabase, runMigrations } from "../apps/api/src/lib/db.js";
import { LearnerService } from "../apps/api/src/services/learnerService.js";
import { EventService } from "../apps/api/src/services/eventService.js";

interface SeedEvent {
  skill: string;
  target: string;
  selectedAnswer?: string;
  correct: boolean;
  foilType?: string;
  difficulty?: string;
  responseTimeMs: number;
  attemptNumber: number;
  daysAgo: number;
}

const SHORT_VOWEL_WORDS: Array<{ target: string; vowelFoil: string }> = [
  { target: "cat", vowelFoil: "cit" },
  { target: "pet", vowelFoil: "pit" },
  { target: "sit", vowelFoil: "set" },
  { target: "hot", vowelFoil: "hat" },
  { target: "cup", vowelFoil: "cap" },
  { target: "bed", vowelFoil: "bad" },
  { target: "fan", vowelFoil: "fin" },
  { target: "dog", vowelFoil: "dig" },
  { target: "run", vowelFoil: "ran" },
  { target: "mop", vowelFoil: "map" }
];

/** Builds a realistic event timeline: short-vowels improving slowly but still weak,
 *  with errors dominated by vowel substitution; initial/final sounds already strong. */
function buildSeedEvents(): SeedEvent[] {
  const events: SeedEvent[] = [];

  // short-vowels: 20 attempts, ~60% accuracy overall, worse recently, mostly vowel-substitution errors.
  SHORT_VOWEL_WORDS.forEach((word, index) => {
    const daysAgo = 14 - index; // oldest first
    const historicalPhase = index < 5;
    const correct = historicalPhase ? index % 2 === 0 : index % 5 !== 0; // improves then dips late
    events.push({
      skill: "short-vowels",
      target: word.target,
      selectedAnswer: correct ? word.target : word.vowelFoil,
      correct,
      foilType: correct ? undefined : "V",
      difficulty: "beginner",
      responseTimeMs: 3500 + index * 120,
      attemptNumber: 1,
      daysAgo
    });
  });
  // Second pass over the same words (more attempts), with a late accuracy dip
  // to create a clear "recent accuracy < historical accuracy" signal.
  SHORT_VOWEL_WORDS.slice(0, 10).forEach((word, index) => {
    const daysAgo = 4 - Math.floor(index / 3);
    const correct = index % 3 !== 0; // mostly wrong recently
    const foilType = correct ? undefined : index % 4 === 0 ? "IC" : "V";
    events.push({
      skill: "short-vowels",
      target: word.target,
      selectedAnswer: correct ? word.target : word.vowelFoil,
      correct,
      foilType,
      difficulty: "beginner",
      responseTimeMs: 4000 + index * 80,
      attemptNumber: 2,
      daysAgo: Math.max(daysAgo, 0)
    });
  });

  // initial-sounds: strong mastery (~90%)
  const initialSoundWords = ["ball", "fish", "moon", "nest", "ring", "sun", "top", "van", "web", "zoo"];
  initialSoundWords.forEach((wordTarget, index) => {
    const correct = index !== 2; // one miss
    events.push({
      skill: "initial-sounds",
      target: wordTarget,
      selectedAnswer: correct ? wordTarget : "d" + wordTarget.slice(1),
      correct,
      foilType: correct ? undefined : "IC",
      difficulty: "beginner",
      responseTimeMs: 2200 + index * 50,
      attemptNumber: 1,
      daysAgo: 10 - index
    });
  });

  // final-sounds: strong mastery (~90%)
  const finalSoundWords = ["cat", "dog", "map", "pen", "hat", "bus", "ten", "cup", "log", "jam"];
  finalSoundWords.forEach((wordTarget, index) => {
    const correct = index !== 7; // one miss
    events.push({
      skill: "final-sounds",
      target: wordTarget,
      selectedAnswer: correct ? wordTarget : wordTarget.slice(0, -1) + "p",
      correct,
      foilType: correct ? undefined : "FC",
      difficulty: "beginner",
      responseTimeMs: 2400 + index * 50,
      attemptNumber: 1,
      daysAgo: 8 - Math.floor(index / 2)
    });
  });

  return events;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const db = openDatabase(env.DATABASE_PATH);
  runMigrations(db);

  const learnerService = new LearnerService(db);
  const eventService = new EventService(db);

  const learner = learnerService.createLearner({ displayName: "Demo Learner", age: 6 });

  const now = Date.now();
  const seedEvents = buildSeedEvents();

  for (const event of seedEvents) {
    const timestamp = new Date(now - event.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    eventService.createEvent(learner.id, {
      skill: event.skill,
      target: event.target,
      selectedAnswer: event.selectedAnswer,
      correct: event.correct,
      foilType: event.foilType,
      difficulty: event.difficulty,
      responseTimeMs: event.responseTimeMs,
      attemptNumber: event.attemptNumber,
      timestamp
    });
  }

  db.close();

  console.log(`Seeded demo learner ${learner.id} with ${seedEvents.length} events.`);
  console.log(`Try: POST /learners/${learner.id}/analyze`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
