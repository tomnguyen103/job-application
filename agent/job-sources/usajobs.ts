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
  toIsoDate,
} from "@/agent/job-sources/utils";

type UsaJobsEnvelope = {
  SearchResult?: {
    SearchResultItems?: unknown[];
  };
};

function firstRecord(value: unknown): Record<string, unknown> | null {
  return asRecord(asArray(value)[0]);
}

function formatRemuneration(value: unknown): string | null {
  const remuneration = firstRecord(value);
  if (!remuneration) {
    return null;
  }

  const min = cleanText(remuneration.MinimumRange);
  const max = cleanText(remuneration.MaximumRange);
  const interval = cleanText(remuneration.RateIntervalCode);

  if (min && max && min !== max) {
    return interval ? `$${min} - $${max} ${interval}` : `$${min} - $${max}`;
  }

  if (min) {
    return interval ? `$${min} ${interval}` : `$${min}`;
  }

  if (max) {
    return interval ? `Up to $${max} ${interval}` : `Up to $${max}`;
  }

  return null;
}

export function normalizeUsaJobsItem(
  value: unknown,
): NormalizedJobPosting | null {
  const item = asRecord(value);
  const descriptor = asRecord(item?.MatchedObjectDescriptor);
  if (!descriptor) {
    return null;
  }

  const details = asRecord(asRecord(descriptor.UserArea)?.Details);
  const title = cleanText(descriptor.PositionTitle);
  const company = cleanText(descriptor.OrganizationName);
  const description = cleanText(details?.JobSummary);
  const url = cleanText(descriptor.PositionURI);

  if (!title || !company || !description || !url) {
    return null;
  }

  const schedule = firstRecord(descriptor.PositionSchedule);

  return {
    provider: "usajobs",
    sourceDisplayName: "USAJOBS",
    providerJobId: cleanText(descriptor.PositionID) || canonicalPostingUrl(url),
    title,
    company,
    location: cleanText(descriptor.PositionLocationDisplay),
    description,
    sourceUrl: canonicalPostingUrl(url),
    applyUrl: url,
    salary: formatRemuneration(descriptor.PositionRemuneration),
    jobType: cleanText(schedule?.Name) || null,
    postedAt: toIsoDate(descriptor.PublicationStartDate),
    metadata: compactMetadata({
      positionId: descriptor.PositionID,
      department: descriptor.DepartmentName,
      closeDate: descriptor.ApplicationCloseDate,
    }),
  };
}

export function createUsaJobsProvider(): JobSourceProvider {
  return {
    key: "usajobs",
    displayName: "USAJOBS",
    isConfigured: () =>
      Boolean(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT),
    search: async (input: JobSearchInput) => {
      const params = new URLSearchParams({
        Keyword: input.jobTitle,
        ResultsPerPage: String(input.limit),
      });

      if (input.location) {
        params.set("LocationName", input.location);
      }

      const data = await fetchJson<UsaJobsEnvelope>(
        `https://data.usajobs.gov/api/search?${params}`,
        {
          headers: {
            "Authorization-Key": process.env.USAJOBS_API_KEY ?? "",
            "User-Agent": process.env.USAJOBS_USER_AGENT ?? "",
          },
        },
      );

      return asArray(data.SearchResult?.SearchResultItems)
        .map(normalizeUsaJobsItem)
        .filter((job): job is NormalizedJobPosting => Boolean(job))
        .slice(0, input.limit);
    },
  };
}
