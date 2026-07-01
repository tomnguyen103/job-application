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
  containsSearchTerms,
  fetchJson,
  searchAtsBoards,
  stripHtml,
  titleCaseSlug,
  toIsoDate,
} from "@/agent/job-sources/utils";

type GreenhouseEnvelope = {
  jobs?: unknown[];
};

export function normalizeGreenhouseJob(
  value: unknown,
  boardSlug: string,
): NormalizedJobPosting | null {
  const job = asRecord(value);
  if (!job) {
    return null;
  }

  const location = asRecord(job.location);
  const title = cleanText(job.title);
  const company = titleCaseSlug(boardSlug) || "Greenhouse company";
  const description = stripHtml(job.content);
  const url = cleanText(job.absolute_url);

  if (!title || !description || !url) {
    return null;
  }

  return {
    provider: "greenhouse",
    sourceDisplayName: "Greenhouse",
    providerJobId:
      (typeof job.id === "string" || typeof job.id === "number"
        ? String(job.id)
        : "") || canonicalPostingUrl(url),
    title,
    company,
    location: cleanText(location?.name) || "Not specified",
    description,
    sourceUrl: canonicalPostingUrl(url),
    applyUrl: url,
    salary: null,
    jobType: null,
    postedAt: toIsoDate(job.updated_at),
    metadata: compactMetadata({
      board: boardSlug,
      internalJobId: job.internal_job_id,
      requisitionId: job.requisition_id,
    }),
  };
}

export function createGreenhouseProvider(boardSlugs: string[]): JobSourceProvider {
  return {
    key: "greenhouse",
    displayName: "Greenhouse",
    isConfigured: () => boardSlugs.length > 0,
    search: (input: JobSearchInput) =>
      searchAtsBoards({
        boardSlugs,
        input,
        fetchBoard: async (boardSlug, searchInput) => {
          const data = await fetchJson<GreenhouseEnvelope>(
            `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
              boardSlug,
            )}/jobs?content=true`,
          );

          const normalized = asArray(data.jobs)
            .map((posting) => normalizeGreenhouseJob(posting, boardSlug))
            .filter((job): job is NormalizedJobPosting => Boolean(job));

          return normalized.filter((job) =>
            containsSearchTerms({
              query: searchInput.jobTitle,
              haystack: `${job.title} ${job.description}`,
            }),
          );
        },
      }),
  };
}
