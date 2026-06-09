import Image from "next/image";
import type { ReactElement } from "react";

type ConfidencePoint = {
  title: string;
  description: string;
  active?: boolean;
};

const confidencePoints: ConfidencePoint[] = [
  {
    title: "Understand your match score",
    description:
      "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what's missing.",
  },
  {
    title: "AI-Powered Job Matching",
    description:
      "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter.",
    active: true,
  },
  {
    title: "Focus on the right roles",
    description:
      "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

export function ApplicationConfidence(): ReactElement {
  return (
    <section className="landing-section-grid mx-auto grid max-w-[1280px] border-x border-t border-border bg-surface lg:grid-cols-2">
      <div className="flex min-h-[690px] items-center justify-center bg-surface-muted px-8 py-16 sm:px-16">
        <Image
          src="/images/agnet-log.png"
          alt="Agent log showing JobPilot matching and resume actions"
          width={2144}
          height={1656}
          sizes="(max-width: 1024px) 84vw, 540px"
          className="h-auto w-full max-w-[540px]"
        />
      </div>

      <div className="flex min-h-[690px] flex-col justify-center border-t border-border bg-surface lg:border-l lg:border-t-0">
        <div className="px-8 py-16 sm:px-16 lg:px-[70px]">
          <h2 className="max-w-[500px] text-[36px] font-bold leading-[1.05] text-text-slate lg:text-[44px]">
            Apply With More Confidence, Every Time
          </h2>
        </div>

        <div className="border-y border-border bg-surface">
          {confidencePoints.map((point, index) => (
            <div
              key={point.title}
              className={`border-l-2 px-8 py-8 sm:px-16 lg:px-[70px] ${
                point.active ? "border-success" : "border-surface"
              } ${
                index < confidencePoints.length - 1
                  ? "border-b border-border"
                  : ""
              }`}
            >
              <h3 className="text-[17px] font-semibold leading-6 text-text-darker">
                {point.title}
              </h3>
              <p className="mt-3 max-w-[480px] text-[15px] font-medium leading-6 text-text-secondary">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
