import type { ReactElement } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { CareerReadinessSummary } from "@/components/profile/CareerReadinessSummary";
import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import { ProfilePageContent } from "@/components/profile/ProfilePageContent";
import { PlanSummary } from "@/components/billing/PlanSummary";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { BillingActions } from "@/components/billing/BillingActions";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { getCurrentPeriodUsage } from "@/lib/billing/usage";
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
    coverLetterTone: "formal",
    preferredLocations: "",
  };
}

export default async function ProfilePage(): Promise<ReactElement> {
  const user = await requireCurrentUser();
  const insforge = await createInsforgeServer();

  const profilePromise = insforge.database
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const entitlementPromise = getUserEntitlement(user.id).catch((err) => {
    console.error("[profile] Error loading entitlement:", err);
    return {
      planKey: "free" as const,
      status: "active",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  });

  const [profileResult, entitlement] = await Promise.all([
    profilePromise,
    entitlementPromise,
  ]);

  const row = profileResult.data;

  let usage = {
    job_search_run: 0,
    job_match_score: 0,
    company_research_run: 0,
    tailored_resume_generate: 0,
    base_resume_generate: 0,
    resume_extract: 0,
  };

  try {
    usage = await getCurrentPeriodUsage(user.id, entitlement);
  } catch (err) {
    console.error("[profile] Error loading usage:", err);
  }

  const profile: Profile = row
    ? mapProfileRowToProfile(row, user.email ?? "")
    : emptyProfile(user.email ?? "");

  const { percentage, missingFields } = computeProfileCompletion(profile);
  const resumeUrl = row?.resume_pdf_url ?? undefined;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto w-full max-w-[1080px] px-6 py-10">
        <div className="flex flex-col gap-6">
          <CareerReadinessSummary
            profile={profile}
            percentage={percentage}
            missingFields={missingFields}
            hasResume={Boolean(resumeUrl)}
          />
          {missingFields.length > 0 && (
            <CompletionIndicator
              percentage={percentage}
              missingFields={missingFields}
            />
          )}

          <div className="rounded-md border border-border bg-surface p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Billing & Subscription
            </h2>
            <p className="mt-2 text-sm text-text-secondary leading-5">
              Manage your subscription tier, pricing plan, and billing history.
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2 items-start">
              <PlanSummary entitlement={entitlement} />
              <div className="space-y-4">
                <UsageMeter usage={usage} planKey={entitlement.planKey} />
                <BillingActions isPro={entitlement.planKey === "pro"} />
              </div>
            </div>
          </div>

          <ProfilePageContent
            profile={profile}
            resumeUrl={resumeUrl}
          />
        </div>
      </section>
    </main>
  );
}
