import Link from "next/link";
import type { ReactElement } from "react";

export function FinalCta(): ReactElement {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-6 lg:px-0 lg:pb-24">
      <div className="landing-luxury-hero flex min-h-[420px] flex-col items-center justify-center rounded-md border border-border px-6 py-16 text-center shadow-artifact sm:px-10">
        <p className="text-sm font-semibold leading-5 text-accent">
          Start with the next role
        </p>
        <h2 className="mt-4 max-w-[760px] text-[38px] font-bold leading-[1.04] text-ink sm:text-[52px] lg:text-[60px]">
          Turn the job hunt into a prepared application system
        </h2>
        <p className="mt-7 max-w-[620px] text-base font-medium leading-7 text-text-secondary">
          Build the profile once, then let every serious role become a clear,
          researched, resume-ready workspace.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            Review workflow
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-muted text-accent transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
            >
              &gt;
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
