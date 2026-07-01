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

type AshbyEnvelope = {
  jobs?: unknown[];
};

export function normalizeAshbyJob(
  value: unknown,
  boardSlug: string,
): NormalizedJobPosting | null {
  const job = asRecord(value);
  if (!job) {
    return null;
  }

  const title = cleanText(job.title);
  const company = titleCaseSlug(boardSlug) || "Ashby company";
  const description = stripHtml(job.descriptionHtml ?? job.description);
  const url =
    cleanText(job.jobUrl) ||
    cleanText(job.applicationUrl) ||
    cleanText(job.applyUrl);

  if (!title || !description || !url) {
    return null;
  }

  return {
    provider: "ashby",
    sourceDisplayName: "Ashby",
    providerJobId: cleanText(job.id) || canonicalPostingUrl(url),
    title,
    company,
    location: cleanText(job.locationName ?? job.location) || "Not specified",
    description,
    sourceUrl: canonicalPostingUrl(url),
    applyUrl: cleanText(job.applicationUrl) || url,
    salary: null,
    jobType: cleanText(job.employmentType) || null,
    postedAt: toIsoDate(job.publishedAt ?? job.createdAt),
    metadata: compactMetadata({
      board: boardSlug,
      department: job.department,
      team: job.team,
    }),
  };
}

export function createAshbyProvider(boardSlugs: string[]): JobSourceProvider {
  return {
    key: "ashby",
    displayName: "Ashby",
    isConfigured: () => boardSlugs.length > 0,
    search: (input: JobSearchInput) =>
      searchAtsBoards({
        boardSlugs,
        input,
        fetchBoard: async (boardSlug, searchInput) => {
          const data = await fetchJson<AshbyEnvelope>(
            `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
              boardSlug,
            )}`,
          );

          const normalized = asArray(data.jobs)
            .map((posting) => normalizeAshbyJob(posting, boardSlug))
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
