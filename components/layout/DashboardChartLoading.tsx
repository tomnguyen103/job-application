import type { ReactElement } from "react";

import { SkeletonBlock } from "@/components/layout/SkeletonBlock";

type DashboardChartLoadingProps = {
  title: string;
};

const chartBarHeights = ["h-28", "h-44", "h-32", "h-52", "h-36", "h-48", "h-28"];

export function DashboardChartLoading({
  title,
}: DashboardChartLoadingProps): ReactElement {
  return (
    <section
      role="status"
      aria-label={`${title} loading`}
      className="h-full rounded-md border border-border bg-surface-elevated p-6 shadow-card"
    >
      <h2 className="text-base font-semibold leading-6 text-text-primary">
        {title}
      </h2>
      <SkeletonBlock className="mt-2 h-4 w-44" />
      <div className="mt-6 flex h-[280px] items-end gap-3">
        {chartBarHeights.map((heightClass, index) => (
          <SkeletonBlock
            key={`${title}-${index}`}
            className={`w-full ${heightClass}`}
          />
        ))}
      </div>
      <span className="sr-only">Loading {title}.</span>
    </section>
  );
}
