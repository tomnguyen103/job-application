import type {
  JobSearchInput,
  JobSourceKey,
  JobSourceProvider,
  NormalizedJobPosting,
} from "@/agent/types";

export type ProviderSearchOutcome = {
  provider: JobSourceKey;
  displayName: string;
  postings: NormalizedJobPosting[];
  error?: string;
};

export type ExistingJobRow = {
  source_url?: string | null;
  source_provider?: string | null;
  source_provider_job_id?: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function searchProviders(
  providers: JobSourceProvider[],
  input: JobSearchInput,
): Promise<ProviderSearchOutcome[]> {
  const outcomes = await Promise.all(
    providers.map(async (provider) => {
      if (!provider.isConfigured()) {
        return {
          provider: provider.key,
          displayName: provider.displayName,
          postings: [],
          error: "Source is enabled but not configured.",
        };
      }

      try {
        const postings = await provider.search(input);
        return {
          provider: provider.key,
          displayName: provider.displayName,
          postings,
        };
      } catch (error) {
        return {
          provider: provider.key,
          displayName: provider.displayName,
          postings: [],
          error: errorMessage(error),
        };
      }
    }),
  );

  return outcomes;
}

export function postingDedupeKeys(posting: NormalizedJobPosting): string[] {
  return [
    posting.providerJobId
      ? `${posting.provider}:${posting.providerJobId}`
      : `${posting.provider}:${posting.sourceUrl}`,
    `url:${posting.sourceUrl}`,
  ];
}

export function existingDedupeKeys(rows: ExistingJobRow[]): Set<string> {
  const keys = new Set<string>();

  for (const row of rows) {
    if (row.source_url) {
      keys.add(`url:${row.source_url}`);
    }
    if (row.source_provider && row.source_provider_job_id) {
      keys.add(`${row.source_provider}:${row.source_provider_job_id}`);
    }
  }

  return keys;
}

export function dedupePostings(
  postings: NormalizedJobPosting[],
  existingRows: ExistingJobRow[],
): { newPostings: NormalizedJobPosting[]; skippedDuplicates: number } {
  const seen = existingDedupeKeys(existingRows);
  const newPostings: NormalizedJobPosting[] = [];
  let skippedDuplicates = 0;

  for (const posting of postings) {
    const keys = postingDedupeKeys(posting);
    const isDuplicate = keys.some((key) => seen.has(key));

    if (isDuplicate) {
      skippedDuplicates += 1;
      continue;
    }

    for (const key of keys) {
      seen.add(key);
    }
    newPostings.push(posting);
  }

  return { newPostings, skippedDuplicates };
}

export function selectPostingsForScoring(
  postings: NormalizedJobPosting[],
  scoreLimit: number,
): { jobsToScore: NormalizedJobPosting[]; skippedForQuota: number } {
  const jobsToScore = postings.slice(0, Math.max(0, scoreLimit));
  return {
    jobsToScore,
    skippedForQuota: Math.max(0, postings.length - jobsToScore.length),
  };
}
