import Browserbase from "@browserbasehq/sdk";

const COMPANY_RESEARCH_SESSION_TIMEOUT_SECONDS = 120;

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getBrowserbaseProjectId(): string {
  return requireEnv("BROWSERBASE_PROJECT_ID");
}

export function createBrowserbaseClient(): Browserbase {
  return new Browserbase({ apiKey: requireEnv("BROWSERBASE_API_KEY") });
}

export async function createCompanyResearchSession(): Promise<{
  client: Browserbase;
  sessionId: string;
}> {
  const client = createBrowserbaseClient();
  const session = await client.sessions.create({
    projectId: getBrowserbaseProjectId(),
    timeout: COMPANY_RESEARCH_SESSION_TIMEOUT_SECONDS,
    browserSettings: {
      blockAds: true,
      viewport: { width: 1280, height: 900 },
    },
    userMetadata: {
      feature: "company-research",
    },
  });

  return { client, sessionId: session.id };
}

export async function releaseBrowserbaseSession(
  client: Browserbase,
  sessionId: string,
): Promise<void> {
  try {
    await client.sessions.update(sessionId, {
      projectId: getBrowserbaseProjectId(),
      status: "REQUEST_RELEASE",
    });
  } catch (error) {
    console.error("[browserbase] session release failed:", error);
  }
}
