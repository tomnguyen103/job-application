import type { ReactElement } from "react";

type Props = {
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

type SkillBadgeProps = {
  skill: string;
  tone: "matched" | "missing";
};

function SparkleIcon(): ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9.8 2.25 11 6.7l4.45 1.2L11 9.1l-1.2 4.45L8.6 9.1 4.15 7.9 8.6 6.7l1.2-4.45Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.15 10.65 4.8 13l2.35.65-2.35.65-.65 2.35-.65-2.35-2.35-.65L3.5 13l.65-2.35Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="m2.5 6.2 2 2 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon(): ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="m3.25 3.25 5.5 5.5M8.75 3.25l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SkillBadge({ skill, tone }: SkillBadgeProps): ReactElement {
  const classes =
    tone === "matched"
      ? "bg-success-lightest text-success-foreground"
      : "bg-accent-muted text-accent";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold leading-4 ${classes}`}
    >
      {tone === "matched" ? <CheckIcon /> : <XIcon />}
      {skill}
    </span>
  );
}

export function MatchScore({
  reason,
  matchedSkills,
  missingSkills,
}: Props): ReactElement {
  return (
    <>
      <section className="rounded-md border border-border bg-surface-elevated p-8 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-lightest text-success">
            <SparkleIcon />
          </span>
          <h2 className="text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary">
            Match reasoning
          </h2>
        </div>
        <p className="mt-6 text-[15px] font-semibold leading-7 text-text-primary">
          {reason}
        </p>
      </section>

      <section className="rounded-md border border-border bg-surface-elevated p-8 shadow-card">
        <h2 className="text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary">
          Required skills vs your profile
        </h2>

        <div className="mt-5">
          <p className="text-sm font-semibold leading-5 text-text-muted">
            You have
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} tone="matched" />
              ))
            ) : (
              <p className="text-sm font-medium text-text-secondary">
                No matched skills saved yet.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold leading-5 text-text-muted">
            Gap skills
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingSkills.length > 0 ? (
              missingSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} tone="missing" />
              ))
            ) : (
              <p className="text-sm font-medium text-text-secondary">
                No skill gaps saved for this role.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
