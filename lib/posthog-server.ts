import { PostHog } from "posthog-node";

import type {
  PostHogProductEventName,
  PostHogProductEventProperties,
} from "@/lib/posthog-events";

type PostHogServerConfig = {
  key: string;
  host: string;
};

function getPostHogServerConfig(): PostHogServerConfig | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) {
    return null;
  }

  return { key, host };
}

function warnMissingPostHogServerConfig(): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[posthog/server] NEXT_PUBLIC_POSTHOG_KEY or NEXT_PUBLIC_POSTHOG_HOST is missing.",
    );
  }
}

export const createPostHogServer = (): PostHog => {
  const config = getPostHogServerConfig();

  if (!config) {
    throw new Error("PostHog server environment variables are not configured.");
  }

  return new PostHog(config.key, {
    host: config.host,
    flushAt: 1,
    flushInterval: 0,
  });
};

export async function capturePostHogServerEvent<
  EventName extends PostHogProductEventName,
>(
  event: EventName,
  properties: PostHogProductEventProperties[EventName],
): Promise<void> {
  const config = getPostHogServerConfig();

  if (!config) {
    warnMissingPostHogServerConfig();
    return;
  }

  const posthog = new PostHog(config.key, {
    host: config.host,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    posthog.capture({
      distinctId: properties.userId,
      event,
      properties,
    });
  } finally {
    await posthog.shutdown();
  }
}
