"use client";

import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { YAxisConfig } from "@/lib/dashboard-charts";

export type ResearchActivityPoint = {
  day: string;
  count: number;
};

type Props = {
  data: ResearchActivityPoint[];
  yAxis: YAxisConfig;
  emptyMessage?: string;
};

const AXIS_TICK = { fill: "var(--color-chart-axis)", fontSize: 12 };

export function ResearchActivityChart({
  data,
  yAxis,
  emptyMessage = "No research activity in the last 7 days — research a company to see this chart.",
}: Props): ReactElement {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-base font-semibold leading-6 text-text-primary">
        Company Research Activity
      </h2>
      <div className="mt-6 h-[280px]">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm font-medium leading-5 text-text-muted">
            {emptyMessage}
          </p>
        ) : (
          /* initialDimension: recharts' -1×-1 default warns on SSR/first render */
          <div
            role="img"
            aria-label="Bar chart of companies researched per day over the last 7 days"
            className="h-full w-full"
          >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 580, height: 280 }}
          >
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border)"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                ticks={yAxis.ticks}
                domain={yAxis.domain}
                width={32}
              />
              <Bar
                dataKey="count"
                fill="var(--color-info)"
                radius={[4, 4, 0, 0]}
                barSize={24}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
