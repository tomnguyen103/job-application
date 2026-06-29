import Image from "next/image";
import type { ReactElement } from "react";

type FeaturePoint = {
  title: string;
  description: string;
};

const featurePoints: FeaturePoint[] = [
  {
    title: "Search without breaking focus",
    description:
      "A familiar job search flow saves qualified roles into one place for comparison.",
  },
  {
    title: "Read the list like a portfolio",
    description:
      "Company, salary, source, date, and match score stay visible at the same decision level.",
  },
  {
    title: "Open only the roles worth preparing",
    description:
      "Each promising role becomes its own workspace for research, resume work, and the apply action.",
  },
];

export function JobSearchEase(): ReactElement {
  return (
    <section
      id="workflow"
      className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-0 lg:py-20"
    >
      <div className="grid overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-[0.9fr_1.1fr]">
        <div className="landing-rule-field flex min-h-[560px] items-center border-b border-border bg-dossier-wash px-6 py-12 sm:px-10 lg:border-b-0 lg:border-r lg:px-12">
          <div className="landing-hover-lift landing-dossier-frame w-full rounded-md border border-chrome p-2 shadow-artifact">
            <div className="overflow-hidden rounded-md border border-dossier-line bg-surface">
              <Image
                src="/images/jobs-lists.png"
                alt="Job match list with companies, scores, salaries, and sources"
                width={2364}
                height={1778}
                sizes="(max-width: 1024px) 84vw, 560px"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <p className="text-sm font-semibold leading-5 text-accent">
            Search to shortlist
          </p>
          <h2 className="mt-4 max-w-[520px] text-[34px] font-bold leading-[1.04] text-text-slate sm:text-[44px] lg:text-[52px]">
            The list becomes a decision instrument
          </h2>
          <p className="mt-6 max-w-[560px] text-base font-medium leading-7 text-text-secondary">
            Job Application turns a search result into an ordered review queue,
            so weak leads do not take the same attention as strong ones.
          </p>

          <div className="mt-10 divide-y divide-border border-y border-border">
            {featurePoints.map((point) => (
              <div key={point.title} className="py-6">
                <h3 className="text-[17px] font-semibold leading-6 text-text-primary">
                  {point.title}
                </h3>
                <p className="mt-2 max-w-[520px] text-sm font-medium leading-6 text-text-secondary">
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
