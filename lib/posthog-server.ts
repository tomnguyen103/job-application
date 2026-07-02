import { PostHog } from "posthog-node";

import type {
  PostHogProductEventName,
  PostHogProductEventProperties,
} from "@/lib/posthog-events";

type PostHogServerConfig = {
  key: string;
  host: string;
};

let postHogServer: PostHog | null = null;

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
  const posthog = getPostHogServer();

  if (!posthog) {
    throw new Error("PostHog server environment variables are not configured.");
  }

  return posthog;
};

function getPostHogServer(): PostHog | null {
  if (postHogServer) {
    return postHogServer;
  }

  const config = getPostHogServerConfig();

  if (!config) {
    warnMissingPostHogServerConfig();
    return null;
  }

  postHogServer = new PostHog(config.key, {
    host: config.host,
    flushAt: 1,
    flushInterval: 0,
  });

  return postHogServer;
}

export async function capturePostHogServerEvent<
  EventName extends PostHogProductEventName,
>(
  event: EventName,
  properties: PostHogProductEventProperties[EventName],
): Promise<void> {
  const posthog = getPostHogServer();

  if (!posthog) {
    return;
  }

  try {
    posthog.capture({
      distinctId: properties.userId,
      event,
      properties,
    });
    await posthog.flush();
  } catch (error) {
    console.error("[posthog/server] event capture failed:", error);
  }
}
