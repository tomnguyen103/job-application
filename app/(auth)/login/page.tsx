import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

import {
  signInWithGitHub,
  signInWithGoogle,
} from "@/actions/auth";
import { OAuthProviderButton } from "@/components/auth/OAuthProviderButton";
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
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-[1120px] overflow-hidden rounded-xl border border-border bg-surface shadow-card lg:grid-cols-[1fr_420px]">
        <div className="landing-hero-gradient flex min-h-[520px] flex-col justify-between border-b border-border px-8 py-8 lg:border-b-0 lg:border-r">
          <Link href="/" aria-label="JobPilot home" className="w-fit">
            <Image src="/logo.png" alt="JobPilot" width={118} height={40} />
          </Link>

          <div>
            <p className="text-xs font-bold uppercase leading-4 text-accent">
              JobPilot
            </p>
            <h1 className="mt-4 max-w-[560px] text-[38px] font-bold leading-[1.05] text-text-black sm:text-[48px]">
              Sign in and bring your job search into focus
            </h1>
            <p className="mt-6 max-w-[500px] text-[15px] font-medium leading-6 text-text-secondary">
              Use your existing Google or GitHub account to keep your profile,
              matches, and company research tied to one workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
          <div>
            <h2 className="text-base font-semibold leading-6 text-text-primary">
              Continue to JobPilot
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
