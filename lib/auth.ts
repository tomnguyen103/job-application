export const supportedOAuthProviders: readonly ["google", "github"] = [
  "google",
  "github",
];

export type SupportedOAuthProvider = (typeof supportedOAuthProviders)[number];

export type LoginProvider = {
  provider: SupportedOAuthProvider;
  label: string;
  badge: string;
};

export const loginProviderDetails: Record<
  SupportedOAuthProvider,
  LoginProvider
> = {
  google: {
    provider: "google",
    label: "Continue with Google",
    badge: "G",
  },
  github: {
    provider: "github",
    label: "Continue with GitHub",
    badge: "GH",
  },
};

export function isSupportedOAuthProvider(
  provider: string,
): provider is SupportedOAuthProvider {
  return supportedOAuthProviders.some((supported) => supported === provider);
}

export function orderedSupportedProviders(
  providers: readonly string[],
): SupportedOAuthProvider[] {
  const enabledProviders = providers.filter(isSupportedOAuthProvider);

  return supportedOAuthProviders.filter((provider) =>
    enabledProviders.includes(provider),
  );
}
