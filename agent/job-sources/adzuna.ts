import type {
  AdzunaJob,
  JobSearchInput,
  JobSourceProvider,
  NormalizedJobPosting,
  UsableAdzunaJob,
} from "@/agent/types";
import { compactMetadata } from "@/agent/job-sources/utils";

type AdzunaCountry = "us" | "gb" | "au" | "ca";

const COUNTRY_KEYWORDS: { country: AdzunaCountry; keywords: string[] }[] = [
  {
    country: "gb",
    keywords: [
      "united kingdom",
      "uk",
      "england",
      "scotland",
      "wales",
      "london",
      "manchester",
    ],
  },
  {
    country: "au",
    keywords: ["australia", "sydney", "melbourne", "brisbane", "perth"],
  },
  {
    country: "ca",
    keywords: ["canada", "toronto", "vancouver", "montreal", "ottawa"],
  },
];

function detectCountry(location: string): AdzunaCountry {
  const normalized = location.toLowerCase();

  for (const { country, keywords } of COUNTRY_KEYWORDS) {
    const matches = keywords.some((keyword) =>
      new RegExp(`\\b${keyword}\\b`).test(normalized),
    );

    if (matches) {
      return country;
    }
  }

  return "us";
}

// Adzuna's redirect_url carries a per-request tracking token (?se=...), so
// the full URL never matches across searches. The canonical form is what gets
// stored and deduped on.
function canonicalSourceUrl(redirectUrl: string): string {
  try {
    const url = new URL(redirectUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return redirectUrl;
  }
}

// Adzuna's `where` parameter is strictly geographic. Remote markers are
// stripped so "Remote" does not make the provider return zero results.
function normalizeWhere(location: string): string {
  return location
    .replace(/\bremote\b/gi, "")
    .replace(/\bwork from home\b/gi, "")
    .replace(/\bwfh\b/gi, "")
    .replace(/[.,/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchJobs(
  jobTitle: string,
  location: string,
  country: AdzunaCountry = "us",
): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error(
      "Adzuna credentials are not configured (ADZUNA_APP_ID / ADZUNA_APP_KEY).",
    );
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: jobTitle,
    category: "it-jobs",
    results_per_page: "10",
    "content-type": "application/json",
  });

  const where = normalizeWhere(location);
  if (where) {
    params.set("where", where);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
    { signal: AbortSignal.timeout(15_000) },
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = (await response.json()) as { results?: AdzunaJob[] };

  return data.results ?? [];
}

export function isUsableAdzunaJob(job: AdzunaJob): job is UsableAdzunaJob {
  return Boolean(
    job.title &&
      job.description &&
      job.redirect_url &&
      job.company?.display_name,
  );
}

function formatSalary(job: UsableAdzunaJob): string | null {
  const toK = (value: number): string => `$${Math.round(value / 1000)}k`;

  if (job.salary_min && job.salary_max) {
    return toK(job.salary_min) === toK(job.salary_max)
      ? toK(job.salary_min)
      : `${toK(job.salary_min)} - ${toK(job.salary_max)}`;
  }

  if (job.salary_min) {
    return `${toK(job.salary_min)}+`;
  }

  if (job.salary_max) {
    return `Up to ${toK(job.salary_max)}`;
  }

  return null;
}

export function normalizeAdzunaJob(job: UsableAdzunaJob): NormalizedJobPosting {
  return {
    provider: "adzuna",
    sourceDisplayName: "Adzuna",
    providerJobId: canonicalSourceUrl(job.redirect_url),
    title: job.title,
    company: job.company.display_name,
    location: job.location?.display_name ?? "",
    description: job.description,
    sourceUrl: canonicalSourceUrl(job.redirect_url),
    applyUrl: job.redirect_url,
    salary: formatSalary(job),
    jobType: job.contract_type || null,
    postedAt: job.created ?? null,
    metadata: compactMetadata({
      salaryIsPredicted: job.salary_is_predicted,
      country: detectCountry(job.location?.display_name ?? ""),
    }),
  };
}

export function createAdzunaProvider(): JobSourceProvider {
  return {
    key: "adzuna",
    displayName: "Adzuna",
    isConfigured: () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    search: async (input: JobSearchInput) => {
      const country = detectCountry(input.location);
      const results = await searchJobs(input.jobTitle, input.location, country);

      return results
        .filter(isUsableAdzunaJob)
        .slice(0, input.limit)
        .map(normalizeAdzunaJob);
    },
  };
}
