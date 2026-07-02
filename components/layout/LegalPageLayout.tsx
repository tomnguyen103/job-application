import type { ReactElement } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

type LegalSection = {
  title: string;
  body: string;
};

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPageLayout({
  eyebrow,
  title,
  lastUpdated,
  sections,
}: LegalPageLayoutProps): ReactElement {
  return (
    <div className="min-h-screen bg-background">
      <Navbar authMode="static" />
      <main>
        <section className="mx-auto w-full max-w-[960px] px-6 py-16">
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[34px] font-bold leading-10 text-text-black">
            {title}
          </h1>
          <p className="mt-4 text-sm font-medium leading-6 text-text-secondary">
            {lastUpdated}
          </p>
          <div className="mt-8 grid gap-4">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-md border border-border bg-surface-elevated p-6 shadow-card"
              >
                <h2 className="text-base font-semibold leading-6 text-text-primary">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-text-secondary">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
