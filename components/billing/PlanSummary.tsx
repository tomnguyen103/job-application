import type { ReactElement } from "react";
import type { UserEntitlement } from "@/lib/billing/plans";

type Props = {
  entitlement: UserEntitlement;
};

export function PlanSummary({ entitlement }: Props): ReactElement {
  const isPro = entitlement.planKey === "pro";
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const dateFormatted = formatDate(entitlement.currentPeriodEnd);

  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Current Plan
          </span>
          <h3 className="mt-1 text-lg font-bold text-text-primary flex items-center gap-2">
            {isPro ? "Pro Plan" : "Free Plan"}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              entitlement.status === "active" || entitlement.status === "trialing"
                ? "bg-success-lightest text-success-foreground"
                : "bg-surface-secondary text-text-secondary"
            }`}>
              {entitlement.status}
            </span>
          </h3>
        </div>
        
        {isPro && entitlement.stripeSubscriptionId && (
          <span className="text-xs font-bold text-accent bg-accent-muted rounded-md px-2.5 py-1">
            PRO SUBSCRIBER
          </span>
        )}
      </div>

      {entitlement.currentPeriodEnd && (
        <div className="mt-4 border-t border-border pt-3 flex items-center justify-between text-xs text-text-secondary">
          <span>
            {entitlement.cancelAtPeriodEnd ? "Expires on" : isPro ? "Renews on" : "Resets on"}
          </span>
          <span className="font-semibold text-text-primary">{dateFormatted}</span>
        </div>
      )}

      {!isPro && (
        <div className="mt-4 border-t border-border pt-3 flex items-center justify-between text-xs text-text-secondary">
          <span>Usage period resets on</span>
          <span className="font-semibold text-text-primary">
            {formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString())}
          </span>
        </div>
      )}
    </div>
  );
}
