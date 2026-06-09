"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

import { insforge } from "@/lib/insforge-client";
import {
  identifyPostHogUser,
  initPostHog,
  posthog,
  resetPostHog,
} from "@/lib/posthog-client";

const storedPostHogUserKey = "jobpilot.posthog.userId";

type Props = {
  children: React.ReactNode;
};

function getStoredPostHogUserId(): string | null {
  try {
    return window.sessionStorage.getItem(storedPostHogUserKey);
  } catch (error) {
    console.error("[posthog/auth-sync]", error);
    return null;
  }
}

function setStoredPostHogUserId(userId: string): void {
  try {
    window.sessionStorage.setItem(storedPostHogUserKey, userId);
  } catch (error) {
    console.error("[posthog/auth-sync]", error);
  }
}

function clearStoredPostHogUserId(): void {
  try {
    window.sessionStorage.removeItem(storedPostHogUserKey);
  } catch (error) {
    console.error("[posthog/auth-sync]", error);
  }
}

export function PostHogProvider({ children }: Props) {
  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncPostHogIdentity(): Promise<void> {
      const {
        data: { user },
        error,
      } = await insforge.auth.getCurrentUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("[posthog/auth-sync]", error);
        return;
      }

      const storedUserId = getStoredPostHogUserId();

      if (user) {
        identifyPostHogUser(user.id);
        setStoredPostHogUserId(user.id);
        return;
      }

      if (storedUserId) {
        resetPostHog();
        clearStoredPostHogUserId();
      }
    }

    syncPostHogIdentity().catch((error: unknown) => {
      console.error("[posthog/auth-sync]", error);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
