import Image from "next/image";
import type { ReactElement } from "react";

type FeaturePoint = {
  title: string;
  description: string;
  active?: boolean;
};

const featurePoints: FeaturePoint[] = [
  {
    title: "Find jobs that actually fit",
    description:
      "Search by title and location or paste a job link. Get matched roles you can quickly scan.",
    active: true,
  },
  {
    title: "Know the Company Before You Apply",
    description:
      "Stop guessing what a company is about. Job Application browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every application",
    description:
      "Keep a clear view of every job you've found, tailored. Your activity and progress all stay in one simple place.",
  },
];

export function JobSearchEase(): ReactElement {
  return (
    <section className="landing-section-grid mx-auto grid max-w-[1280px] border-x border-t border-border bg-surface lg:grid-cols-2">
      <div className="flex min-h-[690px] flex-col justify-center border-b border-border bg-surface lg:border-b-0 lg:border-r">
        <div className="px-8 py-16 sm:px-16 lg:px-[70px]">
          <h2 className="max-w-[420px] text-[36px] font-bold leading-[1.05] text-text-slate lg:text-[44px]">
            Manage Your Job Search With Ease
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

      <div className="flex min-h-[690px] items-center justify-center bg-surface-muted px-8 py-14 sm:px-16">
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
