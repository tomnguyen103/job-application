import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";

const footerLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Condition", href: "/terms" },
];

export function Footer(): ReactElement {
  return (
    <footer className="mx-auto w-full max-w-[1280px] border-x border-border bg-surface">
      <div className="flex min-h-32 flex-col items-start justify-between gap-8 px-8 py-10 md:flex-row md:items-center">
        <Link href="/" aria-label="JobPilot home">
          <Image src="/logo.png" alt="JobPilot" width={118} height={40} />
        </Link>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-9"
        >
          {footerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-dark transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
