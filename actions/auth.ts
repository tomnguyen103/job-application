"use server";

import { createServerClient, clearAuthCookies } from "@insforge/sdk/ssr";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { SupportedOAuthProvider } from "@/lib/auth";

function loginErrorRedirect(error: string): never {
  redirect(`/login?error=${encodeURIComponent(error)}`);
}

async function getRequestOrigin(): Promise<string> {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";

  if (!host) {
    loginErrorRedirect("missing_origin");
  }

  const forwardedProtocol = headersList.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

async function initiateOAuth(provider: SupportedOAuthProvider): Promise<never> {
  const origin = await getRequestOrigin();
  const redirectTo = new URL("/api/auth/callback", origin).toString();
  const insforge = createServerClient();
  const { data, error } = await insforge.auth.signInWithOAuth(provider, {
    redirectTo,
    additionalParams: provider === "google" ? { prompt: "select_account" } : {},
    skipBrowserRedirect: true,
  });

  if (error || !data.url || !data.codeVerifier) {
    if (error) {
      console.error("[auth/oauth-init]", error);
    }
    loginErrorRedirect("oauth_init_failed");
  }

  const cookieStore = await cookies();
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  redirect(data.url);
}

export async function signInWithGoogle(): Promise<never> {
  return initiateOAuth("google");
}

export async function signInWithGitHub(): Promise<never> {
  return initiateOAuth("github");
}

export async function signOut(): Promise<never> {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);
  redirect("/login");
}
