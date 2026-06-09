import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

import { SignOutButton } from "@/components/layout/SignOutButton";
import { getCurrentUser } from "@/lib/insforge-server";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

export async function Navbar(): Promise<ReactElement> {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 lg:px-0">
        <Link href="/" aria-label="JobPilot home">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={118}
            height={40}
            priority
          />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-10 md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-dark transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

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
