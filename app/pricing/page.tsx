import type { ReactElement } from "react";
import Link from "next/link";

import { BillingActions } from "@/components/billing/BillingActions";
import { FeatureItem } from "@/components/billing/FeatureItem";
import { Navbar } from "@/components/layout/Navbar";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { createInsforgeServer } from "@/lib/insforge-server";

export const dynamic = "force-dynamic";

const freeFeatures = [
  "3 Job searches / month",
  "30 AI-scored job matches / month",
  "2 Company research runs / month",
  "2 Job-tailored resumes / month",
  "2 Base resume generations / month",
  "2 Resume extractions / month",
];

const proFeatures = [
  "50 Job searches / month",
  "500 AI-scored job matches / month",
  "25 Company research runs / month",
  "30 Job-tailored resumes / month",
  "10 Base resume generations / month",
  "10 Resume extractions / month",
];

export default async function PricingPage(): Promise<ReactElement> {
  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  let entitlement = null;
  if (user) {
    entitlement = await getUserEntitlement(user.id);
  }

  const isPro = entitlement?.planKey === "pro";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        <section className="mx-auto w-full max-w-[1280px] px-6 py-16 text-center">
          <div className="mx-auto max-w-[640px]">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              PRICING PLANS
            </span>
            <h1 className="mt-4 text-[36px] font-bold leading-tight text-text-primary sm:text-[44px]">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-sm font-medium leading-6 text-text-secondary">
              Choose the plan that fits your career goals. Upgrade or cancel anytime.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-[800px] gap-8 text-left md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-md border border-border bg-surface p-8 shadow-card transition-transform duration-300 hover:scale-[1.01]">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text-primary">
                    Free Plan
                  </h2>
                  {entitlement && !isPro ? (
                    <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-accent">
                      Current Plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Start with enough AI usage to explore focused applications at no cost.
                </p>

                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-bold tracking-tight text-text-primary">
                    $0
                  </span>
                  <span className="ml-1 text-sm text-text-secondary">
                    / month
                  </span>
                </div>

                <ul className="mt-8 space-y-4">
                  {freeFeatures.map((feature) => (
                    <FeatureItem key={feature}>{feature}</FeatureItem>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                {user ? (
                  <span className="block py-2 text-center text-sm font-semibold text-text-muted">
                    {!isPro ? "Your current plan" : "Available plan"}
                  </span>
                ) : (
                  <Link
                    href="/login"
                    className="block w-full rounded-md border border-border bg-surface py-2 text-center text-sm font-semibold text-text-primary shadow-card transition-colors hover:bg-surface-secondary"
                  >
                    Get started
                  </Link>
                )}
              </div>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-md border border-accent bg-surface p-8 shadow-card transition-transform duration-300 hover:scale-[1.01]">
              <div className="absolute right-0 top-0 rounded-bl-md bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Recommended
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text-primary">
                    Pro Plan
                  </h2>
                  {isPro ? (
                    <span className="rounded-full bg-success-lightest px-2.5 py-0.5 text-xs font-semibold text-success-foreground">
                      Current Plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Unlock deeper monthly capacity for an active, research-heavy job search.
                </p>

                <div className="mt-6 flex items-baseline">
                  <span className="text-4xl font-bold tracking-tight text-text-primary">
                    $9
                  </span>
                  <span className="ml-1 text-sm text-text-secondary">
                    / month
                  </span>
                </div>

                <ul className="mt-8 space-y-4">
                  {proFeatures.map((feature) => (
                    <FeatureItem key={feature}>{feature}</FeatureItem>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                {user ? (
                  <BillingActions isPro={isPro} />
                ) : (
                  <Link
                    href="/login?next=%2Fpricing"
                    className="block w-full rounded-md bg-accent py-2 text-center text-sm font-semibold text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
                  >
                    Upgrade to Pro
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
