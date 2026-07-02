import type { ReactElement } from "react";

import { SkeletonBlock } from "@/components/layout/SkeletonBlock";

export function JobDetailsLoadingState(): ReactElement {
  return (
    <div role="status" aria-label="Job details loading" className="flex flex-col gap-6">
      <SkeletonBlock className="h-6 w-32" />
      <section className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="landing-hero-gradient p-6 sm:p-8">
          <SkeletonBlock className="h-4 w-44" />
          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <SkeletonBlock className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <SkeletonBlock className="h-9 w-full max-w-[520px]" />
                <SkeletonBlock className="mt-3 h-7 w-full max-w-[460px]" />
              </div>
            </div>
            <SkeletonBlock className="h-12 w-44" />
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <SkeletonBlock key={item} className="h-24 w-full" />
        ))}
      </div>
      {[0, 1, 2].map((item) => (
        <section
          key={item}
          className="rounded-md border border-border bg-surface-elevated p-6 shadow-card"
        >
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="mt-5 h-4 w-full" />
          <SkeletonBlock className="mt-3 h-4 w-5/6" />
          <SkeletonBlock className="mt-3 h-4 w-2/3" />
        </section>
      ))}
      <span className="sr-only">Loading job details.</span>
    </div>
  );
}
