import type { UserSchema } from "@insforge/sdk";
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { orderedSupportedProviders } from "@/lib/auth";
import type { SupportedOAuthProvider } from "@/lib/auth";

export async function createInsforgeServer() {
  return createServerClient({
    cookies: await cookies(),
  });
}

export async function getCurrentUser(): Promise<UserSchema | null> {
  try {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.auth.getCurrentUser();

    if (error) {
      console.error("[auth/get-current-user]", error);
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("[auth/get-current-user]", error);
    return null;
  }
}

export async function requireCurrentUser(): Promise<UserSchema> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getEnabledOAuthProviders(): Promise<
  SupportedOAuthProvider[]
> {
  try {
    const insforge = await createInsforgeServer();
    const { data, error } = await insforge.auth.getPublicAuthConfig();

    if (error || !data) {
      if (error) {
        console.error("[auth/public-config]", error);
      }
      return [];
    }

    const providers = orderedSupportedProviders(data.oAuthProviders);

    return providers;
  } catch (error) {
    console.error("[auth/public-config]", error);
    return [];
  }
}
