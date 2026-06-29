import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

const careerSignals = [
  {
    label: "Profile",
    detail: "Resume context stays ready",
  },
  {
    label: "Match",
    detail: "Roles scored before review",
  },
  {
    label: "Prepare",
    detail: "Research and resumes live together",
  },
];

export function Hero(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 lg:px-0 lg:pb-24">
      <div className="landing-luxury-hero overflow-hidden rounded-md border border-border shadow-artifact">
        <div className="grid gap-12 px-6 py-12 sm:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-14 lg:py-20">
          <div className="landing-reveal">
            <p className="text-sm font-semibold leading-5 text-accent">
              Private career desk
            </p>
            <h1 className="mt-5 max-w-[700px] text-[42px] font-bold leading-[0.98] text-ink sm:text-[58px] lg:text-[58px]">
              <span className="block">Apply prepared.</span>
              {" "}
              <span className="block">Not overwhelmed.</span>
            </h1>
            <p className="mt-7 max-w-[560px] text-[17px] font-medium leading-8 text-text-secondary">
              Find relevant roles, research each company, and tailor the resume
              from one disciplined workspace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-accent px-5 pl-6 text-sm font-semibold text-accent-foreground shadow-card transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
              >
                Start for free
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-accent transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
                >
                  &gt;
                </span>
              </Link>
              <Link
                href="#workflow"
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-border bg-surface px-5 pl-6 text-sm font-semibold text-text-primary shadow-card transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accent hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]"
              >
                See workflow
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-muted text-accent transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
                >
                  &gt;
                </span>
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {careerSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-md border border-dossier-line bg-surface-glass px-4 py-4"
                >
                  <p className="text-sm font-semibold leading-5 text-text-primary">
                    {signal.label}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-text-secondary">
                    {signal.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-reveal">
            <div className="mx-auto w-full max-w-[660px]">
              <div className="landing-hover-lift landing-dossier-frame rounded-md border border-chrome p-2 shadow-artifact">
                <div className="landing-dossier-core overflow-hidden rounded-md border border-dossier-line p-2">
                  <Image
                    src="/images/dashboard-demo2.png"
                    alt="Job Application dashboard with job stats, activity, and research charts"
                    width={1920}
                    height={969}
                    preload
                    sizes="(max-width: 1024px) 88vw, 620px"
                    className="h-auto w-full rounded-sm border border-border"
                  />
                </div>
              </div>

              <div className="grid gap-4 pt-4 md:grid-cols-2 lg:-mt-4 lg:ml-8 lg:items-end">
                <div className="landing-hover-lift landing-dossier-frame rounded-md border border-chrome p-2 shadow-artifact lg:-rotate-1">
                  <div className="overflow-hidden rounded-md border border-dossier-line bg-surface">
                    <Image
                      src="/images/jobs-lists.png"
                      alt="Shortlist of job matches with company, score, salary, and source"
                      width={2364}
                      height={1778}
                      sizes="(max-width: 768px) 88vw, 300px"
                      className="h-auto w-full"
                    />
                  </div>
                </div>

                <div className="landing-hover-lift landing-dossier-frame rounded-md border border-chrome p-2 shadow-artifact lg:rotate-1">
                  <div className="overflow-hidden rounded-md border border-dossier-line bg-surface">
                    <Image
                      src="/images/agent-log3.png"
                      alt="Agent log with matching, filtering, tailoring, and resume preparation events"
                      width={2144}
                      height={1656}
                      sizes="(max-width: 768px) 88vw, 300px"
                      className="h-[145px] w-full object-cover object-top sm:h-[160px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid border-t border-dossier-line bg-surface-glass text-sm font-medium text-text-secondary md:grid-cols-3">
          <p className="border-b border-dossier-line px-6 py-4 md:border-b-0 md:border-r">
            Score the market before you invest attention.
          </p>
          <p className="border-b border-dossier-line px-6 py-4 md:border-b-0 md:border-r">
            Keep company research beside the role.
          </p>
          <p className="px-6 py-4">
            Generate job-specific resumes without replacing your base file.
          </p>
        </div>
      </div>
    </section>
  );
}
