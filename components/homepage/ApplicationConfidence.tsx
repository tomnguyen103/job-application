import Image from "next/image";
import type { ReactElement } from "react";

type ConfidencePoint = {
  title: string;
  description: string;
};

const confidencePoints: ConfidencePoint[] = [
  {
    title: "Fit reasoning before the application",
    description:
      "See strengths, missing skills, and the match explanation before deciding what deserves effort.",
  },
  {
    title: "Company research beside the role",
    description:
      "Use the dossier to understand the company, the likely need, and interview talking points.",
  },
  {
    title: "A tailored resume with boundaries",
    description:
      "Create a temporary job-specific resume without replacing the base resume saved on your profile.",
  },
];

export function ApplicationConfidence(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-0 lg:pb-20">
      <div className="grid overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-[1.05fr_0.95fr]">
        <div className="px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <p className="text-sm font-semibold leading-5 text-accent">
            Role dossier
          </p>
          <h2 className="mt-4 max-w-[620px] text-[34px] font-bold leading-[1.04] text-text-slate sm:text-[44px] lg:text-[52px]">
            Every strong lead gets a preparation room
          </h2>
          <p className="mt-6 max-w-[600px] text-base font-medium leading-7 text-text-secondary">
            The details page keeps research, fit signals, interview prep, and
            resume tailoring close to the apply decision.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {confidencePoints.map((point) => (
              <div
                key={point.title}
                className="landing-hover-lift rounded-md border border-border bg-surface-elevated p-5 shadow-card"
              >
                <h3 className="text-base font-semibold leading-6 text-text-primary">
                  {point.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-rule-field flex items-center border-t border-border bg-dossier-wash px-6 py-12 sm:px-10 lg:border-l lg:border-t-0 lg:px-12">
          <div className="landing-hover-lift landing-dossier-frame w-full rounded-md border border-chrome p-2 shadow-artifact">
            <div className="overflow-hidden rounded-md border border-dossier-line bg-surface">
              <Image
                src="/images/agent-log3.png"
                alt="Agent log with matching, filtering, tailoring, and preparation events"
                width={2144}
                height={1656}
                sizes="(max-width: 1024px) 84vw, 460px"
                className="h-[260px] w-full object-cover object-top sm:h-[275px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
