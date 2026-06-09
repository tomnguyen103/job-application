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
        className="inline-flex min-h-10 items-center justify-center rounded-md bg-overlay px-5 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90"
      >
        Sign out
      </button>
    </form>
  );
}
