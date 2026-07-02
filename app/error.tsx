"use client";

import Link from "next/link";
import { useEffect, type ReactElement } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}): ReactElement {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <section className="mx-auto max-w-[720px] rounded-md border border-border bg-surface-elevated p-6 shadow-card">
        <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
          Error
        </p>
        <h1 className="mt-3 text-[30px] font-bold leading-9 text-text-black">
          Something interrupted this page
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">
          Try loading the page again. If it keeps failing, return to the
          dashboard and continue from there.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
