import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

export function Hero(): ReactElement {
  return (
    <section className="mx-auto mt-16 max-w-[1280px] border-x border-t border-border bg-surface">
      <div className="landing-hero-gradient flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="max-w-[780px] text-[42px] font-bold leading-[1.02] text-text-black sm:text-[56px] lg:text-[64px]">
          Job hunting is hard.
          <br />
          Your tools shouldn&apos;t be.
        </h1>
        <p className="mt-8 max-w-[560px] text-[15px] font-medium leading-6 text-text-secondary">
          Stop applying blind. JobPilot finds the jobs, researches the companies,
          and gives you everything you need to stand out.
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
      </div>

      <div className="border-t border-border bg-surface-tertiary px-6 py-14 md:px-14">
        <div className="mx-auto max-w-[1140px] overflow-hidden rounded-xl">
          <Image
            src="/images/dashboard-demo.png"
            alt="JobPilot dashboard preview with activity and research charts"
            width={4788}
            height={2416}
            priority
            sizes="(max-width: 1280px) 90vw, 1140px"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
