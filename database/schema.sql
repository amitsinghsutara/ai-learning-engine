-- AI Learning Engine - core schema
-- Learner identities are anonymous: no names, emails, or other PII are stored.

CREATE TABLE IF NOT EXISTS learners (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  age INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  learner_id TEXT NOT NULL REFERENCES learners (id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  target TEXT NOT NULL,
  selected_answer TEXT,
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  foil_type TEXT,
  difficulty TEXT,
  response_time_ms INTEGER,
  attempt_number INTEGER,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_learner ON learning_events (learner_id);
CREATE INDEX IF NOT EXISTS idx_events_learner_skill ON learning_events (learner_id, skill);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON learning_events (timestamp);
