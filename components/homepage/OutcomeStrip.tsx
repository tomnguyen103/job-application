import type { ReactElement } from "react";

const outcomes = [
  {
    label: "Profile",
    detail: "Keep your resume, skills, and target role ready for matching.",
  },
  {
    label: "Search",
    detail: "Scan saved jobs with salary, source, date, and fit signals.",
  },
  {
    label: "Research",
    detail: "Bring company context into the same place as the role.",
  },
  {
    label: "Apply",
    detail: "Create a job-scoped tailored resume when the role is worth it.",
  },
];

export function OutcomeStrip(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] border-x border-t border-border bg-surface">
      <div className="grid gap-px bg-border md:grid-cols-4">
        {outcomes.map((outcome) => (
          <div key={outcome.label} className="bg-surface px-6 py-7 sm:px-8">
            <p className="text-xs font-bold uppercase leading-4 tracking-[0.18em] text-accent">
              {outcome.label}
            </p>
            <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">
              {outcome.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
