import type { Metadata } from "next";
import type { ReactElement } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Terms & Conditions | Job Application",
  description: "Terms and conditions for using Job Application.",
};

const sections = [
  {
    title: "Use of the service",
    body: "Use Job Application for your own job-search workflow and provide accurate account, profile, and billing information. Do not use the service to abuse third-party job boards or providers.",
  },
  {
    title: "Generated content",
    body: "AI-generated matches, research, resumes, and interview notes are drafts. Review every output before using it in an application or interview.",
  },
  {
    title: "Billing and quotas",
    body: "Plan limits apply to searches, scoring, research, resume extraction, and document generation. Paid features depend on the configured payment provider and active subscription status.",
  },
  {
    title: "Availability",
    body: "The product depends on external providers for authentication, payments, AI, job sources, browser automation, analytics, and storage. Those services can affect availability or results.",
  },
];

export default function TermsPage(): ReactElement {
  return (
    <main className="min-h-screen bg-background">
      <Navbar authMode="static" />
      <section className="mx-auto w-full max-w-[960px] px-6 py-16">
        <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
          Terms & Conditions
        </p>
        <h1 className="mt-3 text-[34px] font-bold leading-10 text-text-black">
          Terms for using Job Application
        </h1>
        <p className="mt-4 text-sm font-medium leading-6 text-text-secondary">
          Last updated July 2, 2026.
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
      <Footer />
    </main>
  );
}
