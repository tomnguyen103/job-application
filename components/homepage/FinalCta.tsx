import Link from "next/link";
import type { ReactElement } from "react";

export function FinalCta(): ReactElement {
  return (
    <section className="landing-hero-gradient mx-auto flex min-h-[380px] max-w-[1280px] flex-col items-center justify-center border-x border-b border-border px-6 py-20 text-center">
      <h2 className="max-w-[720px] text-[38px] font-bold leading-[1.05] text-text-black sm:text-[48px] lg:text-[56px]">
        Build momentum before the next application
      </h2>
      <p className="mt-8 max-w-[600px] text-[15px] font-medium leading-6 text-text-secondary">
        Start with your profile, search the market, and let every strong role
        become a focused application workspace.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-7 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
        >
          Start for free <span aria-hidden="true" className="ml-2">&gt;</span>
        </Link>
        <Link
          href="#workflow"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-7 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
        >
          Review the workflow
        </Link>
      </div>
    </section>
  );
}
