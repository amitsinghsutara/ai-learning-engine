import type { SkillProfile } from "../services/api";

const MASTERY_OK_THRESHOLD = 0.75;

function toTitleCase(skill: string): string {
  return skill
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SkillRow({ skill }: { skill: SkillProfile }) {
  const percent = Math.round(skill.mastery * 100);
  const isStrong = skill.mastery >= MASTERY_OK_THRESHOLD;

  return (
    <div className="skill-row">
      <span className="skill-name">{toTitleCase(skill.stats.skill)}</span>
      <span className="skill-mastery">{percent}%</span>
      <span className={isStrong ? "skill-badge ok" : "skill-badge warn"}>{isStrong ? "✓" : "⚠"}</span>
    </div>
  );
}
