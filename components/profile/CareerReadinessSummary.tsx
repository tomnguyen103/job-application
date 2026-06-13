import type { ReactElement } from "react";

import type { Profile } from "@/types";

type Props = {
  profile: Profile;
  percentage: number;
  missingFields: string[];
  hasResume: boolean;
};

type ReadinessCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: "accent" | "info" | "success";
};

function toneClass(tone: ReadinessCardProps["tone"]): string {
  if (tone === "info") {
    return "bg-info-lightest text-info-foreground";
  }

  if (tone === "success") {
    return "bg-success-lightest text-success-foreground";
  }

  return "bg-accent-muted text-accent";
}

function ReadinessCard({
  label,
  value,
  detail,
  tone,
}: ReadinessCardProps): ReactElement {
  return (
    <article className="rounded-md border border-border bg-surface px-4 py-4">
      <span
        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold leading-4 ${toneClass(tone)}`}
      >
        {label}
      </span>
      <p className="mt-4 text-2xl font-semibold leading-8 text-text-black">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium leading-5 text-text-secondary">
        {detail}
      </p>
    </article>
  );
}

export function CareerReadinessSummary({
  profile,
  percentage,
  missingFields,
  hasResume,
}: Props): ReactElement {
  const targetRole = profile.jobTitlesSeeking.trim() || "Target roles";
  const skillsCount = profile.skills.length;
  const rolesCount = profile.workExperience.length;
  const missingText =
    missingFields.length === 0
      ? "Ready for matching"
      : `${missingFields.length} fields to finish`;

  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="landing-hero-gradient px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
          Career readiness
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className="text-[32px] font-bold leading-[1.08] text-text-black sm:text-[42px]">
              Make your profile work harder for every job
            </h1>
            <p className="mt-4 max-w-[680px] text-sm font-medium leading-6 text-text-secondary">
              This is the career context used for matching, resume extraction,
              resume generation, and tailored resume work.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-glass p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-text-secondary">
                Profile readiness
              </span>
              <span className="text-3xl font-semibold leading-9 text-text-black">
                {percentage}%
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-5 text-text-secondary">
              {missingText}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-border md:grid-cols-3">
        <ReadinessCard
          label="Resume"
          value={hasResume ? "Saved" : "Needed"}
          detail={
            hasResume
              ? "A base resume is available for downloads and extraction."
              : "Upload or generate a base resume before tailoring jobs."
          }
          tone="accent"
        />
        <ReadinessCard
          label="Signals"
          value={`${skillsCount} skills`}
          detail={`${rolesCount} role${rolesCount === 1 ? "" : "s"} saved for match context.`}
          tone="success"
        />
        <ReadinessCard
          label="Target"
          value={targetRole}
          detail="Used to guide discovery, matching, and resume positioning."
          tone="info"
        />
      </div>
    </section>
  );
}
