import Link from "next/link";
import type { ReactElement } from "react";

import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getCurrentUser } from "@/lib/insforge-server";

export async function Navbar(): Promise<ReactElement> {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-20 max-w-[1280px] flex-wrap items-center justify-between gap-y-3 px-4 py-3 sm:px-6 md:h-20 md:flex-nowrap md:py-0 lg:px-0">
        <Link href="/" aria-label="Job Application home" className="shrink-0">
          <Logo className="h-8 w-auto sm:h-10" priority />
        </Link>

        <NavLinks />

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {user ? (
            <SignOutButton />
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
            >
              Start for free
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
