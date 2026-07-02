"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import type { ResearchActivityPoint } from "@/components/dashboard/ResearchActivityChart";
import { DashboardChartLoading } from "@/components/layout/DashboardChartLoading";
import type { YAxisConfig } from "@/lib/dashboard-charts";

type Props = {
  data: ResearchActivityPoint[];
  yAxis: YAxisConfig;
  emptyMessage?: string;
};

const ResearchActivityChart = dynamic(
  () =>
    import("@/components/dashboard/ResearchActivityChart").then(
      (module) => module.ResearchActivityChart,
    ),
  {
    loading: () => <DashboardChartLoading title="Company Research Activity" />,
  },
);

export function ResearchActivityChartLoader(props: Props): ReactElement {
  return <ResearchActivityChart {...props} />;
}
