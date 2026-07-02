import type { ReactElement } from "react";

import { SkeletonBlock } from "@/components/layout/SkeletonBlock";

export function FindJobsLoadingState(): ReactElement {
  return (
    <div role="status" aria-label="Find jobs loading" className="flex flex-col gap-6">
      <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="mt-4 h-9 w-full max-w-[460px]" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-[660px]" />
      </section>
      <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
        <SkeletonBlock className="h-6 w-36" />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-32" />
        </div>
      </section>
      <section className="overflow-hidden rounded-md border border-border bg-surface-elevated shadow-card">
        <div className="border-b border-border px-6 py-4">
          <SkeletonBlock className="h-5 w-48" />
        </div>
        <div className="divide-y divide-border">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="grid gap-3 px-6 py-5 md:grid-cols-4">
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-5 w-28" />
            </div>
          ))}
        </div>
      </section>
      <span className="sr-only">Loading job search workspace.</span>
    </div>
  );
}
