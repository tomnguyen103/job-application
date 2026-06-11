import { Stagehand } from "@browserbasehq/stagehand";

import { getBrowserbaseProjectId } from "@/lib/browserbase";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createCompanyResearchStagehand(
  browserbaseSessionId: string,
): Stagehand {
  return new Stagehand({
    env: "BROWSERBASE",
    apiKey: requireEnv("BROWSERBASE_API_KEY"),
    projectId: getBrowserbaseProjectId(),
    browserbaseSessionID: browserbaseSessionId,
    model: {
      modelName: "google/gemini-2.5-flash",
      apiKey: requireEnv("GEMINI_API_KEY"),
    },
    disableAPI: true,
    disablePino: true,
    serverCache: false,
    verbose: 0,
  });
}
