import type { ReactElement } from "react";
import Link from "next/link";

import { Navbar } from "@/components/layout/Navbar";
import { BillingActions } from "@/components/billing/BillingActions";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { createInsforgeServer } from "@/lib/insforge-server";

export const dynamic = "force-dynamic";

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
    <main className="min-h-screen bg-background">
      <Navbar />
      
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

        <div className="mt-12 grid gap-8 md:grid-cols-2 max-w-[800px] mx-auto text-left">
          {/* Free Tier */}
          <div className="rounded-md border border-border bg-surface p-8 shadow-card flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01]">
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-primary">Free Plan</h3>
                {entitlement && !isPro && (
                  <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-accent">
                    Current Plan
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-text-secondary leading-5">
                Let users experience the product with controlled cost.
              </p>
              
              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-text-primary">$0</span>
                <span className="ml-1 text-xs text-text-secondary">/ month</span>
              </div>

              <ul className="mt-8 space-y-4 text-xs font-medium text-text-secondary">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>3 Job searches / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>30 AI-scored job matches / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>2 Company research runs / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>2 Job-tailored resumes / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>2 Base resume generations / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>2 Resume extractions / month</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              {user ? (
                <span className="block text-center text-xs font-semibold text-text-muted py-2">
                  {!isPro ? "Your current plan" : "Available plan"}
                </span>
              ) : (
                <Link
                  href="/login"
                  className="block w-full text-center rounded-md border border-border bg-surface py-2 text-xs font-semibold text-text-primary shadow-card transition-colors hover:bg-surface-secondary"
                >
                  Get started
                </Link>
              )}
            </div>
          </div>

          {/* Pro Tier */}
          <div className="rounded-md border border-accent bg-surface p-8 shadow-card flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-md">
              Recommended
            </div>
            
            <div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-text-primary">Pro Plan</h3>
                {isPro && (
                  <span className="rounded-full bg-success-lightest px-2.5 py-0.5 text-xs font-semibold text-success-foreground">
                    Current Plan
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-text-secondary leading-5">
                Unlock enough monthly usage for an active job search.
              </p>
              
              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-bold tracking-tight text-text-primary">$9</span>
                <span className="ml-1 text-xs text-text-secondary">/ month</span>
              </div>

              <ul className="mt-8 space-y-4 text-xs font-medium text-text-secondary">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>50 Job searches / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>500 AI-scored job matches / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>25 Company research runs / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>30 Job-tailored resumes / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>10 Base resume generations / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>10 Resume extractions / month</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              {user ? (
                <BillingActions isPro={isPro} />
              ) : (
                <Link
                  href="/login?next=%2Fpricing"
                  className="block w-full text-center rounded-md bg-accent py-2 text-xs font-semibold text-accent-foreground shadow-card transition-colors hover:bg-accent-dark"
                >
                  Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
