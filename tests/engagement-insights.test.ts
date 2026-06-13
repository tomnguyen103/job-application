import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInterviewPrepHighlights,
  buildSkillGapInsights,
  buildTodayActions,
  type EngagementJob,
  type EngagementTailoredResume,
} from "@/lib/engagement-insights";
import type { CompanyResearchDossier } from "@/types";

const now = new Date("2026-06-13T12:00:00.000Z");

const jobs: EngagementJob[] = [
  {
    id: "job-1",
    title: "Frontend Engineer",
    company: "Northwind",
    matchScore: 92,
    missingSkills: ["GraphQL", "AWS"],
    researchedAt: null,
  },
  {
    id: "job-2",
    title: "Product Engineer",
    company: "Contoso",
    matchScore: 84,
    missingSkills: ["graphql", "Kubernetes", "GraphQL"],
    researchedAt: "2026-06-12T10:00:00.000Z",
  },
];

test("buildTodayActions prioritizes profile, resume, research, and tailoring actions", () => {
  const actions = buildTodayActions({
    profileComplete: false,
    hasResume: false,
    jobs,
    tailoredResumes: [],
    now,
  });

  assert.deepEqual(
    actions.map((action) => action.id),
    ["complete-profile", "add-resume", "research-company"],
  );
});

test("buildTodayActions skips ready tailored resumes and uses the next best job", () => {
  const tailoredResumes: EngagementTailoredResume[] = [
    {
      jobId: "job-1",
      expiresAt: "2026-06-20T12:00:00.000Z",
    },
  ];
  const actions = buildTodayActions({
    profileComplete: true,
    hasResume: true,
    jobs,
    tailoredResumes,
    now,
  });

  assert.deepEqual(
    actions.map((action) => action.id),
    ["research-company", "tailor-resume", "review-top-match"],
  );
  assert.equal(actions[1].href, "/find-jobs/job-2");
});

test("buildTodayActions starts with search when there are no saved jobs", () => {
  const actions = buildTodayActions({
    profileComplete: true,
    hasResume: true,
    jobs: [],
    tailoredResumes: [],
    now,
  });

  assert.deepEqual(
    actions.map((action) => action.id),
    ["find-first-jobs"],
  );
});

test("buildSkillGapInsights counts each gap once per job and sorts by repetition", () => {
  const insights = buildSkillGapInsights(jobs);

  assert.equal(insights[0].skill, "GraphQL");
  assert.equal(insights[0].count, 2);
  assert.deepEqual(insights[0].companies, ["Northwind", "Contoso"]);
  assert.equal(insights[1].skill, "AWS");
  assert.equal(insights[1].count, 1);
});

test("buildInterviewPrepHighlights prefers saved company research", () => {
  const research: CompanyResearchDossier = {
    companyOverview: "Northwind builds developer tools.",
    techStack: ["React"],
    culture: ["Async writing"],
    whyThisRole: "They need product velocity.",
    yourEdge: ["Your React systems work maps to their frontend needs."],
    gapsToAddress: ["Bridge GraphQL with API integration experience."],
    smartQuestions: ["How does the team evaluate frontend architecture?"],
    interviewPrep: ["Prepare a component performance example."],
    sources: ["https://northwind.example/about"],
  };

  const prep = buildInterviewPrepHighlights({
    company: "Northwind",
    title: "Frontend Engineer",
    research,
    matchedSkills: ["React"],
    missingSkills: ["GraphQL"],
  });

  assert.equal(prep.hasResearch, true);
  assert.deepEqual(prep.focus, ["Prepare a component performance example."]);
  assert.deepEqual(prep.questions, [
    "How does the team evaluate frontend architecture?",
  ]);
});

test("buildInterviewPrepHighlights falls back to match data without research", () => {
  const prep = buildInterviewPrepHighlights({
    company: "Northwind",
    title: "Frontend Engineer",
    research: null,
    matchedSkills: ["React"],
    missingSkills: ["GraphQL"],
  });

  assert.equal(prep.hasResearch, false);
  assert.match(prep.focus[0], /Frontend Engineer/);
  assert.match(prep.leadWith[0], /React/);
  assert.match(prep.gapStrategy[0], /GraphQL/);
});
