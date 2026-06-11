import type { ReactElement } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfilePageContent } from "@/components/profile/ProfilePageContent";
import { createInsforgeServer, requireCurrentUser } from "@/lib/insforge-server";
import { computeProfileCompletion, mapProfileRowToProfile } from "@/lib/utils";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

function emptyProfile(email: string): Profile {
  return {
    fullName: "",
    email,
    phone: "",
    location: "",
    linkedinUrl: "",
    portfolioUrl: "",
    workAuthorization: "citizen",
    currentTitle: "",
    experienceLevel: "junior",
    yearsExperience: "",
    skills: [],
    industries: [],
    workExperience: [],
    education: {
      degree: "high_school",
      fieldOfStudy: "",
      institution: "",
      graduationYear: "",
    },
    jobTitlesSeeking: "",
    remotePreference: "any",
    salaryExpectation: "",
    preferredLocations: "",
  };
}

export default async function ProfilePage(): Promise<ReactElement> {
  const user = await requireCurrentUser();
  const insforge = await createInsforgeServer();

  const { data: row } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile: Profile = row
    ? mapProfileRowToProfile(row, user.email ?? "")
    : emptyProfile(user.email ?? "");

  const { percentage, missingFields } = computeProfileCompletion(profile);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto w-full max-w-[1080px] px-6 py-10">
        <div className="flex flex-col gap-6">
          {missingFields.length > 0 && (
            <CompletionIndicator
              percentage={percentage}
              missingFields={missingFields}
            />
          )}
          <ProfilePageContent
            profile={profile}
            resumeUrl={row?.resume_pdf_url ?? undefined}
          />
        </div>
      </section>
    </main>
  );
}
