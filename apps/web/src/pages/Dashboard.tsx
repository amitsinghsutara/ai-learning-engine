import { useState } from "react";
import {
  analyzeLearner,
  getLearner,
  getLearnerProfile,
  type AnalysisResult,
  type Learner,
  type LearnerProfile
} from "../services/api";
import { SkillRow } from "../components/SkillRow";

export function Dashboard() {
  const [learnerIdInput, setLearnerIdInput] = useState("");
  const [learner, setLearner] = useState<Learner | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  async function handleLoad() {
    const learnerId = learnerIdInput.trim();
    if (!learnerId) return;

    setProfileError(null);
    setAnalysis(null);
    setAnalysisError(null);
    setLoadingProfile(true);
    try {
      const [loadedLearner, loadedProfile] = await Promise.all([
        getLearner(learnerId),
        getLearnerProfile(learnerId)
      ]);
      setLearner(loadedLearner);
      setProfile(loadedProfile);
    } catch (error) {
      setLearner(null);
      setProfile(null);
      setProfileError(error instanceof Error ? error.message : "Failed to load learner.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleAnalyze() {
    if (!learner || loadingAnalysis) return;
    setAnalysisError(null);
    setLoadingAnalysis(true);
    try {
      const result = await analyzeLearner(learner.id);
      setAnalysis(result);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Failed to get an AI recommendation.");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  return (
    <div className="dashboard">
      <h1>AI Learning Engine</h1>

      <section className="card">
        <label htmlFor="learnerId">Learner ID</label>
        <div className="load-row">
          <input
            id="learnerId"
            value={learnerIdInput}
            onChange={(e) => setLearnerIdInput(e.target.value)}
            placeholder="Paste a learner id (e.g. from npm run db:seed)"
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          <button onClick={handleLoad} disabled={loadingProfile || !learnerIdInput.trim()}>
            {loadingProfile ? "Loading…" : "Load"}
          </button>
        </div>
        {profileError && <p className="error">{profileError}</p>}
      </section>

      {learner && profile && (
        <>
          <section className="card">
            <h2>Learner: {learner.displayName ?? "Anonymous"}</h2>
            <div className="overall-mastery">
              <span className="label">Overall Mastery</span>
              <span className="value">{Math.round(profile.overallMastery * 100)}%</span>
            </div>
          </section>

          <section className="card">
            <h2>Skills</h2>
            {profile.skills.length === 0 ? (
              <p className="muted">No learning events recorded yet.</p>
            ) : (
              <div className="skill-list">
                {profile.skills.map((skill) => (
                  <SkillRow key={skill.stats.skill} skill={skill} />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2>AI Recommendation</h2>
            <button onClick={handleAnalyze} disabled={loadingAnalysis || profile.skills.length === 0}>
              {loadingAnalysis ? "Thinking… (local AI can take a minute or two)" : "Get Recommendation"}
            </button>
            {analysisError && <p className="error">{analysisError}</p>}
            {analysis && (
              <div className="recommendation">
                <p>
                  <strong>Focus on:</strong> {analysis.recommendation.focus}
                </p>
                <p>
                  <strong>Recommended difficulty:</strong> {analysis.recommendation.difficulty}
                </p>
                <p>
                  <strong>Recommended practice:</strong> {analysis.recommendation.practiceCount} exercises
                </p>
                <p className="hint">&ldquo;{analysis.recommendation.hint}&rdquo;</p>
                <p className="muted small">{analysis.recommendation.explanation}</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
