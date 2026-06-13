import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

export function Hero(): ReactElement {
  return (
    <section className="mx-auto mt-10 max-w-[1280px] border-x border-t border-border bg-surface">
      <div className="landing-hero-gradient grid gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-14 lg:py-20">
        <div>
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.22em] text-accent">
            Job Application
          </p>
          <h1 className="mt-6 max-w-[660px] text-[42px] font-bold leading-[1.02] text-text-black sm:text-[56px] lg:text-[64px]">
            AI job search workspace
          </h1>
          <p className="mt-7 max-w-[560px] text-base font-medium leading-7 text-text-secondary">
            Find better roles, research companies, and tailor your resume from
            one focused workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
              See workflow
            </Link>
          </div>
          <div className="mt-10 grid gap-3 text-sm font-medium text-text-secondary sm:grid-cols-3">
            <p className="rounded-md border border-border bg-surface-glass px-4 py-3">
              Profile-aware matching
            </p>
            <p className="rounded-md border border-border bg-surface-glass px-4 py-3">
              Company research
            </p>
            <p className="rounded-md border border-border bg-surface-glass px-4 py-3">
              Tailored resumes
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-elevated p-2 shadow-card">
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <Image
              src="/images/dashboard-demo2.png"
              alt="Job Application dashboard preview with activity and research charts"
              width={1920}
              height={969}
              priority
              sizes="(max-width: 1024px) 90vw, 610px"
              className="h-auto w-full"
            />
          </div>
          <div className="grid gap-2 px-2 pb-1 pt-3 text-xs font-semibold text-text-secondary sm:grid-cols-3">
            <span className="rounded-md bg-accent-muted px-3 py-2 text-accent">
              Search
            </span>
            <span className="rounded-md bg-info-lightest px-3 py-2 text-info-foreground">
              Research
            </span>
            <span className="rounded-md bg-success-lightest px-3 py-2 text-success-foreground">
              Apply
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
