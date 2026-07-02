import type { Metadata } from "next";
import type { ReactElement } from "react";

import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

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
    <LegalPageLayout
      eyebrow="Privacy Policy"
      title="Privacy for your job search workspace"
      lastUpdated="Last updated July 2, 2026."
      sections={sections}
    />
  );
}
