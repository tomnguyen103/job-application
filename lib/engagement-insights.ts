import type { CompanyResearchDossier } from "@/types";

import { MATCH_THRESHOLD } from "@/lib/utils";

export type EngagementJob = {
  id: string;
  title: string;
  company: string;
  matchScore: number;
  missingSkills: string[];
  researchedAt: string | null;
};

export type EngagementTailoredResume = {
  jobId: string;
  expiresAt: string | null;
};

export type TodayActionTone = "accent" | "info" | "success";

export type TodayAction = {
  id: string;
  label: string;
  title: string;
  detail: string;
  href: string;
  tone: TodayActionTone;
};

export type SkillGapInsight = {
  skill: string;
  count: number;
  roles: string[];
  companies: string[];
};

export type InterviewPrepHighlights = {
  hasResearch: boolean;
  focus: string[];
  questions: string[];
  gapStrategy: string[];
  leadWith: string[];
};

const ACTION_LIMIT = 3;
const INSIGHT_LIMIT = 5;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueCleanList(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  values.forEach((value) => {
    const text = cleanText(value);
    const key = text.toLowerCase();

    if (!text || seen.has(key)) {
      return;
    }

    seen.add(key);
    cleaned.push(text);
  });

  return cleaned.slice(0, limit);
}

function sortedJobs(jobs: EngagementJob[]): EngagementJob[] {
  return [...jobs].sort((a, b) => b.matchScore - a.matchScore);
}

function isReadyTailoredResume(
  resume: EngagementTailoredResume,
  now: Date,
): boolean {
  if (!resume.expiresAt) {
    return false;
  }

  const expiresAt = Date.parse(resume.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

function hasReadyResumeForJob(
  jobId: string,
  resumes: EngagementTailoredResume[],
  now: Date,
): boolean {
  return resumes.some(
    (resume) => resume.jobId === jobId && isReadyTailoredResume(resume, now),
  );
}

function addAction(
  actions: TodayAction[],
  action: TodayAction,
): TodayAction[] {
  if (actions.some((existing) => existing.id === action.id)) {
    return actions;
  }

  return [...actions, action].slice(0, ACTION_LIMIT);
}

export function buildTodayActions(args: {
  profileComplete: boolean;
  hasResume: boolean;
  jobs: EngagementJob[];
  tailoredResumes: EngagementTailoredResume[];
  now: Date;
}): TodayAction[] {
  const { profileComplete, hasResume, jobs, tailoredResumes, now } = args;
  const actions: TodayAction[] = [];
  const topJobs = sortedJobs(jobs);

  if (!profileComplete) {
    actions.push({
      id: "complete-profile",
      label: "Profile",
      title: "Complete your profile",
      detail: "Finish required fields so matching and tailoring have better context.",
      href: "/profile",
      tone: "accent",
    });
  }

  if (!hasResume) {
    actions.push({
      id: "add-resume",
      label: "Resume",
      title: "Add a base resume",
      detail: "Upload or generate a profile resume before tailoring saved jobs.",
      href: "/profile",
      tone: "info",
    });
  }

  if (topJobs.length === 0) {
    return addAction(actions, {
      id: "find-first-jobs",
      label: "Search",
      title: "Find your first matches",
      detail: "Run an Adzuna search to start building your job pipeline.",
      href: "/find-jobs",
      tone: "success",
    });
  }

  const unresearchedJob = topJobs.find((job) => !job.researchedAt);
  if (unresearchedJob) {
    actions.push({
      id: "research-company",
      label: "Research",
      title: `Research ${unresearchedJob.company}`,
      detail: `Open ${unresearchedJob.title} and build the company dossier before applying.`,
      href: `/find-jobs/${unresearchedJob.id}`,
      tone: "info",
    });
  }

  if (hasResume) {
    const untailoredJob = topJobs.find(
      (job) => !hasReadyResumeForJob(job.id, tailoredResumes, now),
    );

    if (untailoredJob) {
      actions.push({
        id: "tailor-resume",
        label: "Tailor",
        title: `Tailor resume for ${untailoredJob.company}`,
        detail: `Turn ${untailoredJob.title} into a job-specific PDF while the match is fresh.`,
        href: `/find-jobs/${untailoredJob.id}`,
        tone: "accent",
      });
    }
  }

  const topJob = topJobs[0];
  actions.push({
    id: "review-top-match",
    label: topJob.matchScore >= MATCH_THRESHOLD ? "High match" : "Review",
    title: `Review ${topJob.company}`,
    detail: `${topJob.title} is your strongest saved role at ${topJob.matchScore}% match.`,
    href: `/find-jobs/${topJob.id}`,
    tone: "success",
  });

  return actions.slice(0, ACTION_LIMIT);
}

export function buildSkillGapInsights(
  jobs: EngagementJob[],
  limit: number = INSIGHT_LIMIT,
): SkillGapInsight[] {
  const bySkill = new Map<
    string,
    { skill: string; count: number; roles: string[]; companies: string[] }
  >();

  jobs.forEach((job) => {
    const seenInJob = new Set<string>();

    job.missingSkills.forEach((rawSkill) => {
      const skill = cleanText(rawSkill);
      const key = skill.toLowerCase();

      if (!skill || seenInJob.has(key)) {
        return;
      }

      seenInJob.add(key);
      const entry = bySkill.get(key) ?? {
        skill,
        count: 0,
        roles: [],
        companies: [],
      };

      entry.count += 1;
      entry.roles = uniqueCleanList([...entry.roles, job.title], 3);
      entry.companies = uniqueCleanList([...entry.companies, job.company], 3);
      bySkill.set(key, entry);
    });
  });

  return [...bySkill.values()]
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, limit);
}

export function buildInterviewPrepHighlights(args: {
  company: string;
  title: string;
  research: CompanyResearchDossier | null;
  matchedSkills: string[];
  missingSkills: string[];
}): InterviewPrepHighlights {
  const { company, title, research, matchedSkills, missingSkills } = args;
  const leadWith = uniqueCleanList(research?.yourEdge ?? [], 2);
  const gapStrategy = uniqueCleanList(research?.gapsToAddress ?? [], 2);
  const focus = uniqueCleanList(research?.interviewPrep ?? [], 3);
  const questions = uniqueCleanList(research?.smartQuestions ?? [], 2);

  return {
    hasResearch: Boolean(research),
    focus:
      focus.length > 0
        ? focus
        : [
            `Review the saved ${title} posting and prepare one recent project that maps to the role.`,
          ],
    questions:
      questions.length > 0
        ? questions
        : [`Ask how ${company} measures success for this role in the first 90 days.`],
    gapStrategy:
      gapStrategy.length > 0
        ? gapStrategy
        : uniqueCleanList(missingSkills, 2)
            .map(
              (skill) =>
                `Prepare an honest bridge for ${skill} using adjacent experience.`,
            )
            .concat(
              missingSkills.length === 0
                ? ["Prepare one honest answer about how you ramp up on unfamiliar systems."]
                : [],
            ),
    leadWith:
      leadWith.length > 0
        ? leadWith
        : uniqueCleanList(matchedSkills, 2)
            .map(
              (skill) => `Lead with a concrete ${skill} example from your work.`,
            )
            .concat(
              matchedSkills.length === 0
                ? ["Lead with the strongest profile-backed project closest to this role."]
                : [],
            ),
  };
}
