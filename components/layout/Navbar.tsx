import Link from "next/link";
import type { ReactElement } from "react";

import { Logo } from "@/components/layout/Logo";
import { NavLinks } from "@/components/layout/NavLinks";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { getCurrentUser } from "@/lib/insforge-server";

export async function Navbar(): Promise<ReactElement> {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 lg:px-0">
        <Link href="/" aria-label="Job Application home">
          <Logo />
        </Link>

        <NavLinks />

        {user ? (
          <SignOutButton />
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-overlay px-5 text-sm font-medium text-accent-foreground shadow-card transition-opacity hover:opacity-90"
          >
            Start for free
          </Link>
        )}
      </div>
    </header>
  );
}
