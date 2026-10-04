export interface Learner {
  id: string;
  displayName?: string;
  age?: number;
}

export interface SkillStats {
  skill: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageResponseTimeMs: number | null;
  foilErrors: Record<string, number>;
  recentAccuracy: number | null;
  historicalAccuracy: number | null;
}

export interface SkillProfile {
  stats: SkillStats;
  mastery: number;
}

export interface LearnerProfile {
  skills: SkillProfile[];
  overallMastery: number;
}

export interface LearningRecommendation {
  primaryDifficulty: string;
  secondaryDifficulty?: string;
  focus: string;
  difficulty: "beginner" | "easy" | "medium" | "advanced";
  practiceCount: number;
  hint: string;
  explanation: string;
  confidence: number;
}

export interface AnalysisResult {
  skill: string;
  stats: SkillStats;
  mastery: number;
  recommendation: LearningRecommendation;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new Error(body?.error?.message ?? `Request to ${url} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getLearner(learnerId: string): Promise<Learner> {
  return request(`/learners/${learnerId}`);
}

export function getLearnerProfile(learnerId: string): Promise<LearnerProfile> {
  return request(`/learners/${learnerId}/profile`);
}

export function analyzeLearner(learnerId: string, skill?: string): Promise<AnalysisResult> {
  return request(`/learners/${learnerId}/analyze`, {
    method: "POST",
    body: JSON.stringify(skill ? { skill } : {})
  });
}
