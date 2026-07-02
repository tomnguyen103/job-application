"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import type { MatchDistributionPoint } from "@/components/dashboard/MatchDistributionChart";
import { DashboardChartLoading } from "@/components/layout/DashboardChartLoading";
import type { YAxisConfig } from "@/lib/dashboard-charts";

type Props = {
  data: MatchDistributionPoint[];
  yAxis: YAxisConfig;
  emptyMessage?: string;
};

const MatchDistributionChart = dynamic(
  () =>
    import("@/components/dashboard/MatchDistributionChart").then(
      (module) => module.MatchDistributionChart,
    ),
  {
    loading: () => <DashboardChartLoading title="Match Score Distribution" />,
  },
);

export function MatchDistributionChartLoader(props: Props): ReactElement {
  return <MatchDistributionChart {...props} />;
}
