import type { Metadata } from "next";
import type { ReactElement } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Privacy Policy | Job Application",
  description: "Privacy information for Job Application users.",
};

const sections = [
  {
    title: "Information we use",
    body: "Job Application stores profile details, resume files, saved jobs, agent activity, and billing status so the product can search for roles, research companies, and generate resumes.",
  },
  {
    title: "How the product uses it",
    body: "Your information is used to run job searches, score matches, prepare company research, generate documents, enforce quotas, and keep your account secure.",
  },
  {
    title: "Third-party services",
    body: "The app may send necessary data to configured providers for authentication, payments, analytics, AI generation, job discovery, browser automation, file storage, and email delivery.",
  },
  {
    title: "Your choices",
    body: "You can update your profile, replace resume files, manage billing, or sign out from the app. Contact the site owner if you need account data removed.",
  },
];

export default function PrivacyPage(): ReactElement {
  return (
    <main className="min-h-screen bg-background">
      <Navbar authMode="static" />
      <section className="mx-auto w-full max-w-[960px] px-6 py-16">
        <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
          Privacy Policy
        </p>
        <h1 className="mt-3 text-[34px] font-bold leading-10 text-text-black">
          Privacy for your job search workspace
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
