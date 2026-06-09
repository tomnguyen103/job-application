"use client";

import type { ReactElement } from "react";
import { useFormStatus } from "react-dom";

type OAuthSubmitButtonProps = {
  badge: string;
  label: string;
};

export function OAuthSubmitButton({
  badge,
  label,
}: OAuthSubmitButtonProps): ReactElement {
  const { pending } = useFormStatus();

  return (
    <button
      aria-busy={pending}
      disabled={pending}
      type="submit"
      className="flex min-h-12 w-full items-center justify-between rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-card transition-colors hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface-secondary text-xs font-semibold text-text-primary">
          {badge}
        </span>
        {pending ? "Connecting..." : label}
      </span>
      <span aria-hidden="true" className="text-text-muted">
        {pending ? "..." : ">"}
      </span>
    </button>
  );
}
