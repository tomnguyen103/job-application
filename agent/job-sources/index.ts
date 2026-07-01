import { createAdzunaProvider } from "@/agent/job-sources/adzuna";
import { createAshbyProvider } from "@/agent/job-sources/ashby";
import { createGreenhouseProvider } from "@/agent/job-sources/greenhouse";
import { createLeverProvider } from "@/agent/job-sources/lever";
import { createRemotiveProvider } from "@/agent/job-sources/remotive";
import { createUsaJobsProvider } from "@/agent/job-sources/usajobs";
import type { JobSourceKey, JobSourceProvider } from "@/agent/types";
import { JOB_SOURCE_KEYS } from "@/agent/types";

const DEFAULT_SOURCE_KEYS: JobSourceKey[] = ["adzuna", "remotive", "usajobs"];
const ATS_SOURCE_KEYS = ["greenhouse", "lever", "ashby"] as const;

type AtsSourceKey = (typeof ATS_SOURCE_KEYS)[number];

export type AtsBoardConfig = {
  provider: AtsSourceKey;
  slug: string;
};

function isJobSourceKey(value: string): value is JobSourceKey {
  return JOB_SOURCE_KEYS.includes(value as JobSourceKey);
}

function isAtsSourceKey(value: JobSourceKey): value is AtsSourceKey {
  return ATS_SOURCE_KEYS.includes(value as AtsSourceKey);
}

export function parseEnabledSourceKeys(
  value = process.env.JOB_SOURCE_PROVIDERS,
): JobSourceKey[] {
  if (!value?.trim()) {
    return DEFAULT_SOURCE_KEYS;
  }

  const keys = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(isJobSourceKey);

  return Array.from(new Set(keys));
}

export function parseAtsBoards(
  value = process.env.JOB_SOURCE_ATS_BOARDS,
): AtsBoardConfig[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => {
      const [provider, ...slugParts] = entry.split(":");
      const normalizedProvider = provider?.trim().toLowerCase();
      const slug = slugParts.join(":").trim();

      if (!normalizedProvider || !isJobSourceKey(normalizedProvider)) {
        return null;
      }

      if (!isAtsSourceKey(normalizedProvider) || !slug) {
        return null;
      }

      return { provider: normalizedProvider, slug };
    })
    .filter((entry): entry is AtsBoardConfig => Boolean(entry));
}

function slugsFor(
  boards: AtsBoardConfig[],
  provider: AtsSourceKey,
): string[] {
  return Array.from(
    new Set(
      boards
        .filter((board) => board.provider === provider)
        .map((board) => board.slug),
    ),
  );
}

export function getEnabledJobSourceProviders(): JobSourceProvider[] {
  const atsBoards = parseAtsBoards();
  const enabledKeys = new Set(parseEnabledSourceKeys());

  for (const board of atsBoards) {
    enabledKeys.add(board.provider);
  }

  const providers: JobSourceProvider[] = [];

  if (enabledKeys.has("adzuna")) {
    providers.push(createAdzunaProvider());
  }
  if (enabledKeys.has("remotive")) {
    providers.push(createRemotiveProvider());
  }
  if (enabledKeys.has("usajobs")) {
    providers.push(createUsaJobsProvider());
  }
  if (enabledKeys.has("greenhouse")) {
    providers.push(createGreenhouseProvider(slugsFor(atsBoards, "greenhouse")));
  }
  if (enabledKeys.has("lever")) {
    providers.push(createLeverProvider(slugsFor(atsBoards, "lever")));
  }
  if (enabledKeys.has("ashby")) {
    providers.push(createAshbyProvider(slugsFor(atsBoards, "ashby")));
  }

  return providers;
}
