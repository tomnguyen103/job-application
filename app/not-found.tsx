import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Page not found | Job Application",
};

export default function NotFound(): ReactElement {
  return (
    <main className="min-h-screen bg-background">
      <Navbar authMode="static" />
      <section className="mx-auto w-full max-w-[1280px] px-6 py-16 lg:px-0">
        <div className="max-w-[720px] rounded-md border border-border bg-surface-elevated p-6 shadow-card">
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Not found
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-9 text-text-black">
            This page is not available
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">
            The link may be outdated, or the page may have moved.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
            >
              Go to dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
            >
              Return home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
