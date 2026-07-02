import type { createInsforgeServer } from "@/lib/insforge-server";
import type { Profile } from "@/types";

export type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;
export type LogLevel = "info" | "success" | "warning" | "error";

export type CompanyResearchJob = {
  id: string;
  title: string;
  company: string;
  description: string;
  postUrl: string | null;
  matchedSkills: string[];
  missingSkills: string[];
};

export type ResearchCompanyArgs = {
  insforge: InsforgeServer;
  userId: string;
  job: CompanyResearchJob;
  profile: Profile;
};

export type ResearchLogger = (entry: {
  userId: string;
  jobId: string;
  message: string;
  level: LogLevel;
}) => Promise<void>;

export type PageLinkKind =
  | "about"
  | "careers"
  | "blog"
  | "engineering"
  | "product"
  | "team"
  | "other";

export type PageLink = {
  url: string;
  kind: PageLinkKind;
};

export type CleanHomepageExtraction = {
  oneLiner: string;
  productSummary: string;
  technologies: string[];
  signals: string[];
  pageLinks: PageLink[];
};

export type CleanSubPageExtraction = {
  url: string;
  kind: PageLinkKind;
  keyPoints: string[];
  technologies: string[];
  valuesOrCulture: string[];
  notable: string[];
};

export type BrowserResearch = {
  homepageUrl: string | null;
  homepage: CleanHomepageExtraction | null;
  subPages: CleanSubPageExtraction[];
  sources: string[];
};
