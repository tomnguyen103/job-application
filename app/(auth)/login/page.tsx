import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import {
  signInWithGitHub,
  signInWithGoogle,
} from "@/actions/auth";
import { OAuthProviderButton } from "@/components/auth/OAuthProviderButton";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { loginProviderDetails } from "@/lib/auth";
import type { SupportedOAuthProvider } from "@/lib/auth";
import {
  getCurrentUser,
  getEnabledOAuthProviders,
} from "@/lib/insforge-server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const providerActions: Record<
  SupportedOAuthProvider,
  () => Promise<never>
> = {
  google: signInWithGoogle,
  github: signInWithGitHub,
};

const errorMessages: Record<string, string> = {
  exchange_failed: "We could not finish that sign in. Try again.",
  missing_origin: "The app URL is not configured for sign in yet.",
  missing_verifier: "That sign in session expired. Start again.",
  oauth_failed: "The provider could not complete sign in.",
  oauth_init_failed: "We could not start that sign in. Try again.",
  unexpected_error: "Something went wrong while signing in.",
};

const noProvidersMessage =
  "Sign in is not available for this workspace right now.";

function getLoginErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  return errorMessages[error] ?? "Sign in did not complete. Try again.";
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<ReactElement> {
  const [params, user, enabledProviders] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getEnabledOAuthProviders(),
  ]);

  if (user) {
    redirect("/dashboard");
  }

  const errorMessage = getLoginErrorMessage(params?.error);
  const hasEnabledProviders = enabledProviders.length > 0;

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1120px] overflow-hidden rounded-md border border-border bg-surface shadow-card lg:grid-cols-[1fr_420px]">
        <div className="landing-hero-gradient flex flex-col gap-10 border-b border-border px-6 py-7 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Job Application home" className="w-fit">
              <Logo />
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
              Job Application
            </p>
            <h1 className="mt-5 max-w-[560px] text-[36px] font-bold leading-[1.05] text-text-black sm:text-[48px]">
              Sign in to your job search workspace
            </h1>
            <p className="mt-6 max-w-[500px] text-[15px] font-medium leading-6 text-text-secondary">
              Keep your profile, matches, company research, and tailored
              resumes connected to one secure account.
            </p>
          </div>

          <div className="grid gap-3 text-sm font-medium text-text-secondary sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-md border border-border bg-surface-glass px-4 py-3">
              Upload once, reuse your career context.
            </div>
            <div className="rounded-md border border-border bg-surface-glass px-4 py-3">
              Return to your saved roles and research.
            </div>
            <div className="rounded-md border border-border bg-surface-glass px-4 py-3">
              Pick up tailored resume work where you left it.
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <div>
            <h2 className="text-base font-semibold leading-6 text-text-primary">
              Continue to Job Application
            </h2>
            <p className="mt-2 text-xs font-medium leading-4 text-text-secondary">
              Choose the account you want to use for this workspace.
            </p>
          </div>

          {errorMessage ? (
            <p className="mt-6 rounded-md border border-border bg-surface-secondary px-4 py-3 text-sm font-medium leading-5 text-text-primary">
              {errorMessage}
            </p>
          ) : null}

          {hasEnabledProviders ? (
            <div className="mt-6 flex flex-col gap-3">
              {enabledProviders.map((provider) => {
                const details = loginProviderDetails[provider];

                return (
                  <OAuthProviderButton
                    key={provider}
                    action={providerActions[provider]}
                    badge={details.badge}
                    label={details.label}
                  />
                );
              })}
            </div>
          ) : (
            <p className="mt-6 rounded-md border border-border bg-surface-secondary px-4 py-3 text-sm font-medium leading-5 text-text-primary">
              {noProvidersMessage}
            </p>
          )}

          <p className="mt-8 text-xs font-medium leading-5 text-text-secondary">
            After sign in, you will land on the dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}
