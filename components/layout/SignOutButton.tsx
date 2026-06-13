"use client";

import type { ReactElement } from "react";

import { signOut } from "@/actions/auth";
import { resetPostHog } from "@/lib/posthog-client";

export function SignOutButton(): ReactElement {
  return (
    <form action={signOut}>
      <button
        type="submit"
        onClick={() => resetPostHog()}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
      >
        Sign out
      </button>
    </form>
  );
}
