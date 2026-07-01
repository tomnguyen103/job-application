import type {
  AdzunaJob,
  JobSearchInput,
  JobSourceProvider,
  NormalizedJobPosting,
  UsableAdzunaJob,
} from "@/agent/types";
import { compactMetadata } from "@/agent/job-sources/utils";
import { canonicalSourceUrl, detectCountry, searchJobs } from "@/lib/adzuna";

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
