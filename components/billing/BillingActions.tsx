"use client";

import { useState, type ReactElement } from "react";

type Props = {
  isPro: boolean;
};

export function BillingActions({ isPro }: Props): ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const handleAction = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    setFallbackMode(false);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate billing session.");
      }

      if (data.fallback) {
        setFallbackMode(true);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL returned.");
      }
    } catch (err) {
      console.error("[billing/actions]", err);
      setError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {isPro ? (
          <button
            onClick={() => handleAction("/api/billing/portal")}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary disabled:opacity-50"
          >
            {loading ? (
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            Manage billing
          </button>
        ) : (
          <button
            onClick={() => handleAction("/api/billing/checkout")}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? (
              <svg className="mr-2 h-4 w-4 animate-spin text-accent-foreground" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            Upgrade to Pro
          </button>
        )}
      </div>

      {fallbackMode && (
        <div className="rounded-md border border-border bg-surface-secondary p-3">
          <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            Payments coming soon
          </p>
          <p className="mt-1 text-xs text-text-secondary leading-4">
            Subscriptions and Stripe checkouts are not yet enabled for this environment. 
            Contact your administrator to enable backend billing.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-border bg-surface-secondary p-3 text-xs text-error font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
