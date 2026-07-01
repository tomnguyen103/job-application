import type {
  JobSearchInput,
  JobSourceProvider,
  NormalizedJobPosting,
} from "@/agent/types";
import {
  asArray,
  asRecord,
  canonicalPostingUrl,
  cleanText,
  compactMetadata,
  fetchJson,
  stripHtml,
} from "@/agent/job-sources/utils";

type RemotiveEnvelope = {
  jobs?: unknown[];
};

export function buildRemotiveSearchParams(
  input: JobSearchInput,
): URLSearchParams {
  const search = [input.jobTitle, input.location]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");

  return new URLSearchParams({
    search,
    limit: String(input.limit),
  });
}

function locationSearchTokens(location: string): string[] {
  return cleanText(location)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function remotiveLocationMatchesSearch(
  searchLocation: string,
  candidateLocation: string,
): boolean {
  const tokens = locationSearchTokens(searchLocation);
  if (tokens.length === 0) {
    return true;
  }

  const candidate = `${cleanText(candidateLocation).toLowerCase()} remote`;
  return tokens.some((token) =>
    new RegExp(`(?:^|[^a-z0-9])${token}(?:$|[^a-z0-9])`).test(candidate),
  );
}

export function normalizeRemotiveJob(
  value: unknown,
): NormalizedJobPosting | null {
  const job = asRecord(value);
  if (!job) {
    return null;
  }

  const title = cleanText(job.title);
  const company = cleanText(job.company_name);
  const description = stripHtml(job.description);
  const url = cleanText(job.url);

  if (!title || !company || !description || !url) {
    return null;
  }

  const id =
    typeof job.id === "string" || typeof job.id === "number"
      ? String(job.id)
      : canonicalPostingUrl(url);

  return {
    provider: "remotive",
    sourceDisplayName: "Remotive",
    providerJobId: id,
    title,
    company,
    location: cleanText(job.candidate_required_location) || "Remote",
    description,
    sourceUrl: canonicalPostingUrl(url),
    applyUrl: url,
    salary: cleanText(job.salary) || null,
    jobType: cleanText(job.job_type) || null,
    postedAt: cleanText(job.publication_date) || null,
    metadata: compactMetadata({
      category: job.category,
      tags: Array.isArray(job.tags) ? job.tags.join(", ") : undefined,
    }),
  };
}

export function createRemotiveProvider(): JobSourceProvider {
  return {
    key: "remotive",
    displayName: "Remotive",
    isConfigured: () => true,
    search: async (input: JobSearchInput) => {
      const params = buildRemotiveSearchParams(input);
      const data = await fetchJson<RemotiveEnvelope>(
        `https://remotive.com/api/remote-jobs?${params}`,
      );

      return asArray(data.jobs)
        .map(normalizeRemotiveJob)
        .filter((job): job is NormalizedJobPosting => Boolean(job))
        .filter((job) =>
          remotiveLocationMatchesSearch(input.location, job.location),
        )
        .slice(0, input.limit);
    },
  };
}
