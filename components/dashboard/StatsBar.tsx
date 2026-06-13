import type { ReactElement } from "react";

export type DashboardStat = {
  label: string;
  value: string;
  badge?: string;
  caption: string;
};

type Props = {
  stats: DashboardStat[];
};

export function StatsBar({ stats }: Props): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <section
          key={stat.label}
          className="rounded-md border border-border bg-surface-elevated p-6 shadow-card"
        >
          <p className="text-sm font-medium leading-5 text-text-secondary">
            {stat.label}
          </p>
          <p className="mt-2 text-[30px] font-semibold leading-9 text-text-black">
            {stat.value}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs font-normal leading-4 text-text-muted">
            {stat.badge ? (
              <span className="rounded-sm bg-success-lightest px-2 py-0.5 text-xs font-medium leading-4 text-success-darker">
                {stat.badge}
              </span>
            ) : null}
            <span>{stat.caption}</span>
          </p>
        </section>
      ))}
    </div>
  );
}
