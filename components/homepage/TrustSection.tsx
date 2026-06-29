import type { ReactElement } from "react";

const trustPoints = [
  {
    title: "The profile remains the source of truth",
    description:
      "Matching and resume work start from the career context the user saved.",
  },
  {
    title: "The application stays under user control",
    description:
      "The assistant prepares research and documents. The user decides where to apply.",
  },
  {
    title: "Generated files are scoped to the role",
    description:
      "Tailored resumes stay separate from the base resume and expire after the job-specific window.",
  },
];

export function TrustSection(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-0 lg:pb-20">
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <div className="grid lg:grid-cols-[0.86fr_1.14fr]">
          <div className="landing-quiet-band border-b border-border px-6 py-12 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">
            <p className="text-sm font-semibold leading-5 text-accent">
              Trust model
            </p>
            <h2 className="mt-4 max-w-[520px] text-[34px] font-bold leading-[1.05] text-text-slate sm:text-[44px] lg:text-[52px]">
              Built for better judgment, not higher noise
            </h2>
          </div>

          <div className="divide-y divide-border px-6 py-4 sm:px-10 lg:px-14">
            {trustPoints.map((point) => (
              <div key={point.title} className="py-8">
                <h3 className="text-[18px] font-semibold leading-7 text-text-primary">
                  {point.title}
                </h3>
                <p className="mt-2 max-w-[620px] text-sm font-medium leading-6 text-text-secondary">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
