import type { ReactElement } from "react";

import { SkeletonBlock } from "@/components/layout/SkeletonBlock";

export function ProfileLoadingState(): ReactElement {
  return (
    <div role="status" aria-label="Profile loading" className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="landing-hero-gradient px-6 py-7 sm:px-8">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-5 h-9 w-full max-w-[520px]" />
          <SkeletonBlock className="mt-4 h-4 w-full max-w-[680px]" />
        </div>
      </section>
      <section className="rounded-md border border-border bg-surface p-6 shadow-card">
        <SkeletonBlock className="h-5 w-44" />
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <SkeletonBlock className="h-40 w-full" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </section>
      <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
        <SkeletonBlock className="h-6 w-48" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <SkeletonBlock key={item} className="h-10 w-full" />
          ))}
        </div>
      </section>
      <span className="sr-only">Loading profile.</span>
    </div>
  );
}
