import posthog from "posthog-js";
import type { Properties } from "posthog-js";

import type {
  PostHogProductEventName,
  PostHogProductEventProperties,
} from "@/lib/posthog-events";

const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

let hasInitializedPostHog = false;

function warnMissingPostHogConfig(): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[posthog] NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST is missing.",
    );
  }
}

export function initPostHog(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (hasInitializedPostHog) {
    return true;
  }

  if (!postHogKey || !postHogHost) {
    warnMissingPostHogConfig();
    return false;
  }

  posthog.init(postHogKey, {
    api_host: postHogHost,
    capture_pageview: false,
  });
  hasInitializedPostHog = true;

  return true;
}

export function capturePostHogPageView(currentUrl: string): void {
  if (!initPostHog()) {
    return;
  }

  posthog.capture("$pageview", { $current_url: currentUrl });
}

export function capturePostHogEvent<EventName extends PostHogProductEventName>(
  event: EventName,
  properties: PostHogProductEventProperties[EventName],
): void {
  if (!initPostHog()) {
    return;
  }

  const eventProperties: Properties = properties;
  posthog.capture(event, eventProperties);
}

export function identifyPostHogUser(userId: string): void {
  if (!initPostHog()) {
    return;
  }

  posthog.identify(userId, { userId });
}

export function resetPostHog(): void {
  if (!initPostHog()) {
    return;
  }

  posthog.reset();
}

export { posthog };
