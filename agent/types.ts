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

export type JobMatchContent = {
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
};

export type SavedJob = {
  id: string;
  matchScore: number;
};

export type DiscoveryResult = {
  found: number;
  saved: number;
  strongMatches: number;
  savedJobs: SavedJob[];
};
