"use client";

import { useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { Tabs } from "@/components/layout/Tabs";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import type { Profile } from "@/types";

type Props = {
  profile: Profile;
  resumeUrl?: string;
  billingContent: ReactNode;
};

export function ProfilePageContent({
  profile,
  resumeUrl,
  billingContent,
}: Props): ReactElement {
  const [mergedProfile, setMergedProfile] = useState<Profile>(profile);
  const [extractionKey, setExtractionKey] = useState(0);

  function handleExtract(extracted: Partial<Profile>): void {
    // No confirm gate: clicking Extract is the user's intent, and a native
    // dialog is invisible in replays and silently discards the data when
    // dismissed or suppressed by the browser. Applying remounts the form
    // (key below); ResumeUpload shows an explicit success line instead.
    setMergedProfile((prev) => {
      const next = { ...prev };

      for (const [k, v] of Object.entries(extracted)) {
        const key = k as keyof Profile;
        if (v === null || v === undefined) continue;

        if (Array.isArray(v)) {
          if (v.length > 0) (next as Record<string, unknown>)[key] = v;
        } else if (typeof v === "object") {
          const existing =
            ((next as Record<string, unknown>)[key] as Record<string, unknown>) ??
            {};
          const merged: Record<string, unknown> = { ...existing };
          for (const [subKey, subVal] of Object.entries(
            v as Record<string, unknown>,
          )) {
            if (subVal != null && String(subVal).trim()) {
              merged[subKey] = subVal;
            }
          }
          (next as Record<string, unknown>)[key] = merged;
        } else if (typeof v === "string" && v.trim()) {
          (next as Record<string, unknown>)[key] = v;
        }
      }

      return next;
    });
    setExtractionKey((n) => n + 1);
  }

  return (
    <Tabs
      ariaLabel="Profile sections"
      items={[
        {
          id: "profile",
          label: "Profile",
          children: <ProfileForm key={extractionKey} profile={mergedProfile} />,
        },
        {
          id: "resume",
          label: "Resume",
          children: (
            <ResumeUpload resumeUrl={resumeUrl} onExtract={handleExtract} />
          ),
        },
        {
          id: "billing",
          label: "Billing",
          children: billingContent,
        },
      ]}
    />
  );
}
