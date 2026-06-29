import type { ReactElement } from "react";

const outcomes = [
  {
    label: "Profile",
    detail: "Save the resume, skills, and preferences that shape every match.",
  },
  {
    label: "Search",
    detail: "See the market through salary, source, timing, and fit signals.",
  },
  {
    label: "Research",
    detail: "Bring company context into the same workspace as the role.",
  },
  {
    label: "Apply",
    detail: "Create a job-specific resume only when the opportunity deserves it.",
  },
];

export function OutcomeStrip(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-0">
      <div className="landing-quiet-band overflow-hidden rounded-md border border-border">
        <div className="grid md:grid-cols-4">
          {outcomes.map((outcome, index) => (
            <div
              key={outcome.label}
              className={`px-6 py-7 sm:px-8 ${
                index < outcomes.length - 1
                  ? "border-b border-border md:border-b-0 md:border-r"
                  : ""
              }`}
            >
              <p className="text-base font-semibold leading-6 text-text-primary">
                {outcome.label}
              </p>
              <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">
                {outcome.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
