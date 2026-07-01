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
  titleCaseSlug,
  toIsoDate,
} from "@/agent/job-sources/utils";

export function normalizeLeverJob(
  value: unknown,
  boardSlug: string,
): NormalizedJobPosting | null {
  const job = asRecord(value);
  if (!job) {
    return null;
  }

  const categories = asRecord(job.categories);
  const title = cleanText(job.text);
  const company = titleCaseSlug(boardSlug) || "Lever company";
  const description = cleanText(
    `${cleanText(job.descriptionPlain)} ${cleanText(job.additionalPlain)}`,
  );
  const url = cleanText(job.hostedUrl);

  if (!title || !description || !url) {
    return null;
  }

  return {
    provider: "lever",
    sourceDisplayName: "Lever",
    providerJobId: cleanText(job.id) || canonicalPostingUrl(url),
    title,
    company,
    location: cleanText(categories?.location) || "Not specified",
    description,
    sourceUrl: canonicalPostingUrl(url),
    applyUrl: url,
    salary: null,
    jobType: cleanText(categories?.commitment) || null,
    postedAt: toIsoDate(job.createdAt),
    metadata: compactMetadata({
      board: boardSlug,
      team: categories?.team,
      department: categories?.department,
    }),
  };
}

export function createLeverProvider(boardSlugs: string[]): JobSourceProvider {
  return {
    key: "lever",
    displayName: "Lever",
    isConfigured: () => boardSlugs.length > 0,
    search: (input: JobSearchInput) =>
      searchAtsBoards({
        boardSlugs,
        input,
        fetchBoard: async (boardSlug, searchInput) => {
          const data = await fetchJson<unknown[]>(
            `https://api.lever.co/v0/postings/${encodeURIComponent(
              boardSlug,
            )}?mode=json`,
          );

          const normalized = asArray(data)
            .map((posting) => normalizeLeverJob(posting, boardSlug))
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
