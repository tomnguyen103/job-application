import type { ReactElement } from "react";

const trustPoints = [
  {
    title: "Built around your actual profile",
    description:
      "Matching and tailoring use the career context you save, not a generic checklist.",
  },
  {
    title: "Personal workspace by default",
    description:
      "Saved roles, company research, and resume work stay tied to your account.",
  },
  {
    title: "Focused on the job search you have now",
    description:
      "No billing screens, team accounts, or admin panels get in the way of applying.",
  },
];

export function TrustSection(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] border-x border-t border-border bg-overlay px-6 py-16 text-overlay-foreground sm:px-10 lg:px-14">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Built for focus
          </p>
          <h2 className="mt-5 max-w-[520px] text-[34px] font-bold leading-[1.08] sm:text-[44px]">
            A modern job search should reduce tabs, not add more chores
          </h2>
        </div>
        <div className="grid gap-4">
          {trustPoints.map((point) => (
            <div
              key={point.title}
              className="rounded-lg border border-border bg-surface-glass p-5"
            >
              <h3 className="text-base font-semibold leading-6 text-text-primary">
                {point.title}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-text-secondary">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
