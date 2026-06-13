import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { CompanyResearch } from "@/components/job-details/CompanyResearch";
import { JobActions } from "@/components/job-details/JobActions";
import { JobDescription } from "@/components/job-details/JobDescription";
import { JobInfo } from "@/components/job-details/JobInfo";
import { MatchScore } from "@/components/job-details/MatchScore";
import {
  TailoredResumeAction,
  type TailoredResumeInitialState,
} from "@/components/job-details/TailoredResumeAction";
import { Navbar } from "@/components/layout/Navbar";
import { parseCompanyResearchDossier } from "@/lib/company-research";
import {
  createInsforgeServer,
  requireCurrentUser,
} from "@/lib/insforge-server";
import { formatRelativeTime } from "@/lib/utils";
import type { CompanyResearchDossier } from "@/types";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ id: string }>;

type JobDetailsRow = {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  source_url: string | null;
  external_apply_url: string | null;
  about_role: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  nice_to_have: string[] | null;
  benefits: string[] | null;
  about_company: string | null;
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  company_research: unknown;
  found_at: string | null;
};

type TailoredResumeRow = {
  id: string;
  generated_at: string | null;
  expires_at: string | null;
};

type JobDetails = {
  title: string;
  company: string;
  location: string;
  salary: string;
  jobType: string;
  postUrl: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  aboutCompany: string;
  matchScore: number;
  matchReason: string;
  matchedSkills: string[];
  missingSkills: string[];
  companyResearch: CompanyResearchDossier | null;
  dateFound: string;
};

function cleanText(value: string | null | undefined, fallback: string): string {
  const text = value?.trim();
  return text ? text : fallback;
}

function cleanList(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function formatJobType(value: string | null): string {
  const normalized = value?.replace(/[_-]/g, " ").trim().toLowerCase();

  if (!normalized) {
    return "—";
  }

  if (normalized === "fulltime" || normalized === "full time") {
    return "Full time";
  }

  if (normalized === "parttime" || normalized === "part time") {
    return "Part time";
  }

  return normalized
    .split(/\s+/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function clampScore(score: number | null): number {
  if (score === null || !Number.isFinite(score)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

// The stored dossier's techStack was already evidence-filtered against the
// browser research and job posting when the agent saved it (agent/research.ts)
// — re-filtering here with no research evidence would strip researched tech.
function companyResearchForDisplay(
  row: JobDetailsRow,
): CompanyResearchDossier | null {
  return parseCompanyResearchDossier(row.company_research);
}

function mapJobRowToDetails(row: JobDetailsRow): JobDetails {
  const description = cleanText(row.about_role, "");

  return {
    title: cleanText(row.title, "Untitled role"),
    company: cleanText(row.company, "Unknown company"),
    location: cleanText(row.location, "—"),
    salary: cleanText(row.salary, "—"),
    jobType: formatJobType(row.job_type),
    postUrl: row.external_apply_url ?? row.source_url,
    description,
    responsibilities: cleanList(row.responsibilities),
    requirements: cleanList(row.requirements),
    niceToHave: cleanList(row.nice_to_have),
    benefits: cleanList(row.benefits),
    aboutCompany: cleanText(row.about_company, ""),
    matchScore: clampScore(row.match_score),
    matchReason: cleanText(
      row.match_reason,
      "No AI match reasoning has been saved for this role yet.",
    ),
    matchedSkills: cleanList(row.matched_skills),
    missingSkills: cleanList(row.missing_skills),
    companyResearch: companyResearchForDisplay(row),
    dateFound: row.found_at ? formatRelativeTime(row.found_at) : "—",
  };
}

function mapTailoredResumeInitialState(
  jobId: string,
  row: TailoredResumeRow | null,
): TailoredResumeInitialState {
  if (!row?.expires_at) {
    return { status: "idle", downloadUrl: null, expiresAt: null };
  }

  const expiresAt = Date.parse(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return { status: "expired", downloadUrl: null, expiresAt: row.expires_at };
  }

  return {
    status: "ready",
    downloadUrl: `/api/jobs/${jobId}/tailored-resume/download`,
    expiresAt: row.expires_at,
  };
}

function BackIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9.5 4 5.5 8l4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function JobDetailsPage({
  params,
}: {
  params: PageParams;
}): Promise<ReactElement> {
  const user = await requireCurrentUser();
  const { id } = await params;
  const insforge = await createInsforgeServer();

  const { data, error } = await insforge.database
    .from("jobs")
    .select(
      "id, title, company, location, salary, job_type, source_url, external_apply_url, about_role, responsibilities, requirements, nice_to_have, benefits, about_company, match_score, match_reason, matched_skills, missing_skills, company_research, found_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[job-details] job read error:", error);
    notFound();
  }

  if (!data) {
    notFound();
  }

  // Boundary assertion on the SDK row shape: the selected columns above define this detail view.
  const job = mapJobRowToDetails(data as JobDetailsRow);

  const { data: tailoredResumeData, error: tailoredResumeError } =
    await insforge.database
      .from("tailored_resumes")
      .select("id, generated_at, expires_at")
      .eq("user_id", user.id)
      .eq("job_id", data.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (tailoredResumeError) {
    console.error(
      "[job-details] tailored resume read error:",
      tailoredResumeError,
    );
  }

  const tailoredResumeInitialState = mapTailoredResumeInitialState(
    data.id,
    tailoredResumeData as TailoredResumeRow | null,
  );

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto w-full max-w-[1080px] px-6 py-10">
        <Link
          href="/find-jobs"
          className="inline-flex items-center gap-2 text-base font-semibold leading-6 text-text-secondary transition-colors hover:text-accent"
        >
          <BackIcon />
          Back to Jobs
        </Link>

        <div className="mt-8 flex flex-col gap-6">
          <JobInfo
            title={job.title}
            company={job.company}
            matchScore={job.matchScore}
            postUrl={job.postUrl}
            salary={job.salary}
            location={job.location}
            jobType={job.jobType}
            dateFound={job.dateFound}
          />

          <MatchScore
            reason={job.matchReason}
            matchedSkills={job.matchedSkills}
            missingSkills={job.missingSkills}
          />

          <JobDescription
            description={job.description}
            postUrl={job.postUrl}
            responsibilities={job.responsibilities}
            requirements={job.requirements}
            niceToHave={job.niceToHave}
            benefits={job.benefits}
            aboutCompany={job.aboutCompany}
          />

          <CompanyResearch
            jobId={data.id}
            company={job.company}
            initialResearch={job.companyResearch}
          />
          <TailoredResumeAction
            jobId={data.id}
            initialState={tailoredResumeInitialState}
          />
          <JobActions company={job.company} applyUrl={job.postUrl} />
        </div>
      </section>
    </main>
  );
}
