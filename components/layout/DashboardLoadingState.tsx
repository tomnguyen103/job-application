import type { ReactElement } from "react";

import { DashboardChartLoading } from "@/components/layout/DashboardChartLoading";
import { SkeletonBlock } from "@/components/layout/SkeletonBlock";

export function DashboardLoadingState(): ReactElement {
  return (
    <div role="status" aria-label="Dashboard loading" className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="landing-hero-gradient grid gap-8 px-6 py-7 lg:grid-cols-[1fr_380px] lg:items-center lg:px-8">
          <div>
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="mt-5 h-10 w-full max-w-[520px]" />
            <SkeletonBlock className="mt-4 h-4 w-full max-w-[620px]" />
            <SkeletonBlock className="mt-2 h-4 w-full max-w-[480px]" />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <SkeletonBlock className="h-11 w-32" />
              <SkeletonBlock className="h-11 w-40" />
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-glass p-4">
            <SkeletonBlock className="h-5 w-28" />
            <div className="mt-4 grid gap-3">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
            </div>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <section
            key={item}
            className="rounded-md border border-border bg-surface-elevated p-6 shadow-card"
          >
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="mt-3 h-9 w-20" />
            <SkeletonBlock className="mt-3 h-4 w-28" />
          </section>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardChartLoading title="Recent Activity" />
        <DashboardChartLoading title="Company Research Activity" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardChartLoading title="Jobs Found Over Time" />
        </div>
        <DashboardChartLoading title="Match Score Distribution" />
      </div>
      <span className="sr-only">Loading dashboard.</span>
    </div>
  );
}
