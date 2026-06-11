"use client";

import type { ReactElement } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { YAxisConfig } from "@/lib/dashboard-charts";

export type JobsOverTimePoint = {
  day: string;
  count: number;
};

type Props = {
  data: JobsOverTimePoint[];
  yAxis: YAxisConfig;
  emptyMessage?: string;
};

const AXIS_TICK = { fill: "var(--color-chart-axis)", fontSize: 12 };

export function JobsOverTimeChart({
  data,
  yAxis,
  emptyMessage = "No jobs found in the last 30 days — run a job search to see this chart.",
}: Props): ReactElement {
  return (
    <section className="h-full rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-base font-semibold leading-6 text-text-primary">
        Jobs Found Over Time
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
            aria-label="Area chart of jobs found per day over the last 30 days"
            className="h-full w-full"
          >
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 800, height: 280 }}
          >
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="jobsOverTimeFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={AXIS_TICK}
                ticks={yAxis.ticks}
                domain={yAxis.domain}
                width={32}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-accent)"
                strokeWidth={3}
                fill="url(#jobsOverTimeFill)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
