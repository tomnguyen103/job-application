import type { Metadata } from "next";
import type { ReactElement } from "react";

import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

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
    <LegalPageLayout
      eyebrow="Terms & Conditions"
      title="Terms for using Job Application"
      lastUpdated="Last updated July 2, 2026."
      sections={sections}
    />
  );
}
