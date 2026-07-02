import type { ReactElement } from "react";
import Link from "next/link";

import { BILLING_PLANS, type BillingEventType } from "@/lib/billing/plans";

type Props = {
  usage: Record<BillingEventType, number>;
  planKey: "free" | "pro";
};

export function UsageMeter({ usage, planKey }: Props): ReactElement {
  const plan = BILLING_PLANS[planKey];
  const eventTypes = Object.keys(plan.quotas) as BillingEventType[];
  const hasNearLimitUsage = eventTypes.some((type) => {
    const current = usage[type] || 0;
    const limit = plan.quotas[type].limit;
    return Math.round((current / limit) * 100) >= 90;
  });

  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-card">
      <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
        Plan Usage
      </h3>
      <div className="mt-4 grid gap-4">
        {eventTypes.map((type) => {
          const current = usage[type] || 0;
          const quota = plan.quotas[type];
          const limit = quota.limit;
          const percent = Math.min(100, Math.round((current / limit) * 100));

          let colorClass = "bg-success";
          if (percent >= 90) {
            colorClass = "bg-error";
          } else if (percent > 70) {
            colorClass = "bg-info";
          }

          return (
            <div key={type} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-text-secondary">
                  {quota.displayName}
                </span>
                <span className="font-semibold text-text-primary">
                  {current} / <span className="text-text-muted">{limit}</span>
                </span>
              </div>
              
              <div className="h-2 w-full rounded-full bg-border-light overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {hasNearLimitUsage ? (
        <Link
          href="/pricing"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
        >
          View plans
        </Link>
      ) : null}
    </div>
  );
}
