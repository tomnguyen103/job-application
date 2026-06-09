import Link from "next/link";
import type { ReactElement } from "react";

export function FinalCta(): ReactElement {
  return (
    <section className="landing-hero-gradient mx-auto flex min-h-[420px] max-w-[1280px] flex-col items-center justify-center border-x border-b border-border px-6 py-20 text-center">
      <h2 className="max-w-[720px] text-[38px] font-bold leading-[1.05] text-text-black sm:text-[48px] lg:text-[56px]">
        Your next job search can feel a lot less overwhelming
      </h2>
      <p className="mt-8 max-w-[600px] text-[15px] font-medium leading-6 text-text-secondary">
        Set up your profile, upload your resume, and start finding matches in
        minutes.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-overlay px-7 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90"
        >
          Get Started <span aria-hidden="true" className="ml-2">&gt;</span>
        </Link>
        <Link
          href="/find-jobs"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary"
        >
          Find Your First Match
        </Link>
      </div>
    </section>
  );
}
