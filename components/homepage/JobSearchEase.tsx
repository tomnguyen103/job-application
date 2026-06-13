import Image from "next/image";
import type { ReactElement } from "react";

type FeaturePoint = {
  title: string;
  description: string;
  active?: boolean;
};

const featurePoints: FeaturePoint[] = [
  {
    title: "Search with your target role in mind",
    description:
      "Use a familiar search flow, then let the app score roles against your profile before you sink time into them.",
    active: true,
  },
  {
    title: "Scan the list without losing context",
    description:
      "Compare company, salary, source, date, and match score from one compact surface built for quick decisions.",
  },
  {
    title: "Open the best leads as workspaces",
    description:
      "Each saved role becomes a place for fit notes, company research, tailored resume work, and apply actions.",
  },
];

export function JobSearchEase(): ReactElement {
  return (
    <section
      id="workflow"
      className="landing-section-grid mx-auto grid max-w-[1280px] border-x border-t border-border bg-surface lg:grid-cols-2"
    >
      <div className="flex flex-col justify-center border-b border-border bg-surface lg:min-h-[620px] lg:border-b-0 lg:border-r">
        <div className="px-8 py-16 sm:px-16 lg:px-[70px]">
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Workflow
          </p>
          <h2 className="mt-5 max-w-[500px] text-[34px] font-bold leading-[1.05] text-text-slate lg:text-[44px]">
            Move from search to shortlist faster
          </h2>
        </div>

        <div className="border-y border-border bg-surface">
          {featurePoints.map((point, index) => (
            <div
              key={point.title}
              className={`border-l-2 px-8 py-8 sm:px-16 lg:px-[70px] ${
                point.active ? "border-accent" : "border-surface"
              } ${
                index < featurePoints.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <h3 className="text-[17px] font-semibold leading-6 text-text-darker">
                {point.title}
              </h3>
              <p className="mt-3 max-w-[450px] text-[15px] font-medium leading-6 text-text-secondary">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center bg-surface-muted px-8 py-14 sm:px-16 lg:min-h-[620px]">
        <Image
          src="/images/jobs-lists.png"
          alt="Job match list with companies, scores, salaries, and sources"
          width={2364}
          height={1778}
          loading="eager"
          sizes="(max-width: 1024px) 84vw, 520px"
          className="h-auto w-full max-w-[560px]"
        />
      </div>
    </section>
  );
}
