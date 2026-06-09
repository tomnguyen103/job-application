type PostHogEventBaseProperties = {
  userId: string;
};

export type PostHogProductEventProperties = {
  job_search_started: PostHogEventBaseProperties & {
    jobTitle: string;
    location: string;
  };
  job_found: PostHogEventBaseProperties & {
    source: "search";
    matchScore: number;
  };
  profile_completed: PostHogEventBaseProperties;
  company_researched: PostHogEventBaseProperties & {
    jobId: string;
    company: string;
  };
};

export type PostHogProductEventName = keyof PostHogProductEventProperties;
