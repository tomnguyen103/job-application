"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import type { Profile } from "@/types";

type Props = {
  profile: Profile;
  resumeUrl?: string;
};

export function ProfilePageContent({ profile, resumeUrl }: Props): ReactElement {
  const [mergedProfile, setMergedProfile] = useState<Profile>(profile);
  const [extractionKey, setExtractionKey] = useState(0);

  function handleExtract(extracted: Partial<Profile>): void {
    // Applying extraction remounts the form (key below), which discards any
    // unsaved manual edits — make that explicit instead of silent.
    if (
      !window.confirm(
        "Apply the extracted resume data to the form? Unsaved manual edits will be replaced.",
      )
    ) {
      return;
    }
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
    <>
      <ResumeUpload resumeUrl={resumeUrl} onExtract={handleExtract} />
      <ProfileForm key={extractionKey} profile={mergedProfile} />
    </>
  );
}
