// Raw Adzuna search result item. External API data — every field can be
// missing, so discovery narrows results to UsableAdzunaJob before scoring.
export type AdzunaJob = {
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  redirect_url?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: "0" | "1";
  contract_type?: string;
  created?: string;
};

export type UsableAdzunaJob = AdzunaJob & {
  title: string;
  description: string;
  redirect_url: string;
  company: { display_name: string };
};

export const JOB_SOURCE_KEYS = [
  "adzuna",
  "remotive",
  "usajobs",
  "greenhouse",
  "lever",
  "ashby",
] as const;

export type JobSourceKey = (typeof JOB_SOURCE_KEYS)[number];

export type JobSearchInput = {
  jobTitle: string;
  location: string;
  limit: number;
};

export type SourceMetadataValue = string | number | boolean | null;

export type NormalizedJobPosting = {
  provider: JobSourceKey;
  sourceDisplayName: string;
  providerJobId: string | null;
  title: string;
  company: string;
  location: string;
  description: string;
  sourceUrl: string;
  applyUrl: string;
  salary: string | null;
  jobType: string | null;
  postedAt: string | null;
  metadata: Record<string, SourceMetadataValue>;
};

export type JobSourceProvider = {
  key: JobSourceKey;
  displayName: string;
  isConfigured: () => boolean;
  search: (input: JobSearchInput) => Promise<NormalizedJobPosting[]>;
};

export type DiscoverySourceSummary = {
  provider: JobSourceKey;
  displayName: string;
  found: number;
  saved: number;
  strongMatches: number;
  error?: string;
};

export type JobMatchContent = {
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

export type SavedJob = {
  id: string;
  matchScore: number;
  sourceProvider: JobSourceKey;
  sourceDisplayName: string;
};

export type DiscoveryResult = {
  found: number;
  saved: number;
  strongMatches: number;
  savedJobs: SavedJob[];
  sources: DiscoverySourceSummary[];
  skippedDuplicates: number;
  skippedForQuota: number;
};
