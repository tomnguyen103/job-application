"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Find Jobs", href: "/find-jobs", icon: "search" },
  { label: "Profile", href: "/profile", icon: "profile" },
] as const;

type NavIcon = (typeof NAV_ITEMS)[number]["icon"];

function NavItemIcon({ icon }: { icon: NavIcon }): ReactElement {
  if (icon === "dashboard") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="2.2"
          y="2.2"
          width="4.8"
          height="4.8"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="9"
          y="2.2"
          width="4.8"
          height="4.8"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="2.2"
          y="9"
          width="4.8"
          height="4.8"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="9"
          y="9"
          width="4.8"
          height="4.8"
          rx="1.2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (icon === "search") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="7.2"
          cy="7.2"
          r="4.6"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="m13.5 13.5-2.8-2.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="5.2" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.8 13.6c.7-2.3 2.8-3.6 5.2-3.6s4.5 1.3 5.2 3.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NavLinks(): ReactElement {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary navigation"
      className="hidden items-stretch gap-10 self-stretch md:flex"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center gap-2 text-sm font-medium transition-colors ${
              isActive ? "text-accent" : "text-text-dark hover:text-accent"
            }`}
          >
            <NavItemIcon icon={item.icon} />
            {item.label}
            {isActive ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
