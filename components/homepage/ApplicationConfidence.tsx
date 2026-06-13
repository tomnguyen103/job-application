import Image from "next/image";
import type { ReactElement } from "react";

type ConfidencePoint = {
  title: string;
  description: string;
  active?: boolean;
};

const confidencePoints: ConfidencePoint[] = [
  {
    title: "Understand the match before you apply",
    description:
      "See how your skills line up with the role, where you look strong, and what still needs attention.",
  },
  {
    title: "Research the company in context",
    description:
      "Keep company intelligence next to the role so your application is grounded in more than a job title.",
    active: true,
  },
  {
    title: "Tailor the resume for this job",
    description:
      "Generate a job-scoped resume without changing the base resume stored on your profile.",
  },
];

export function ApplicationConfidence(): ReactElement {
  return (
    <section className="landing-section-grid mx-auto grid max-w-[1280px] border-x border-t border-border bg-surface lg:grid-cols-2">
      <div className="flex items-center justify-center bg-surface-muted px-8 py-16 sm:px-16 lg:min-h-[620px]">
        <Image
          src="/images/agent-log3.png"
          alt="Agent log showing Job Application matching and resume actions"
          width={2144}
          height={1656}
          sizes="(max-width: 1024px) 84vw, 540px"
          className="h-auto w-full max-w-[540px]"
        />
      </div>

      <div className="flex flex-col justify-center border-t border-border bg-surface lg:min-h-[620px] lg:border-l lg:border-t-0">
        <div className="px-8 py-16 sm:px-16 lg:px-[70px]">
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Decision page
          </p>
          <h2 className="mt-5 max-w-[520px] text-[34px] font-bold leading-[1.05] text-text-slate lg:text-[44px]">
            Turn each promising role into a clear next step
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
