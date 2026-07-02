"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import type { JobsOverTimePoint } from "@/components/dashboard/JobsOverTimeChart";
import { DashboardChartLoading } from "@/components/layout/DashboardChartLoading";
import type { YAxisConfig } from "@/lib/dashboard-charts";

type Props = {
  data: JobsOverTimePoint[];
  yAxis: YAxisConfig;
  emptyMessage?: string;
};

const JobsOverTimeChart = dynamic(
  () =>
    import("@/components/dashboard/JobsOverTimeChart").then(
      (module) => module.JobsOverTimeChart,
    ),
  {
    loading: () => <DashboardChartLoading title="Jobs Found Over Time" />,
  },
);

export function JobsOverTimeChartLoader(props: Props): ReactElement {
  return <JobsOverTimeChart {...props} />;
}
