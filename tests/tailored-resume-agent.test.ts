import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTailoredResumeInput,
  buildTailoredResumePrompt,
  extractFirstJsonObject,
  sanitizeTailoredResumeContent,
  type TailoredResumeJob,
} from "../agent/tailored-resume";
import type { Profile } from "../types";

const profile: Profile = {
  fullName: "Taylor Nguyen",
  email: "taylor@example.com",
  phone: "555-0100",
  location: "Austin, TX",
  linkedinUrl: "https://linkedin.example/taylor",
  portfolioUrl: "https://taylor.example",
  workAuthorization: "citizen",
  currentTitle: "Full Stack Developer",
  experienceLevel: "mid",
  yearsExperience: "5",
  skills: ["TypeScript", "React", "PostgreSQL"],
  industries: ["Healthcare"],
  workExperience: [
    {
      company: "Care Tools",
      title: "Software Engineer",
      startDate: "2021-01",
      endDate: "",
      currentlyWorking: true,
      responsibilities:
        "Built React dashboards and PostgreSQL-backed workflow tools for care teams.",
    },
  ],
  education: {
    degree: "bachelors",
    fieldOfStudy: "Computer Science",
    institution: "State University",
    graduationYear: "2018",
  },
  jobTitlesSeeking: "Software Engineer",
  remotePreference: "hybrid",
  salaryExpectation: "",
  preferredLocations: "Austin, TX",
};

const job: TailoredResumeJob = {
  id: "job-1",
  title: "Frontend Engineer",
  company: "Healthware",
  aboutRole: "Build patient-facing workflow tools.",
  responsibilities: ["Create accessible React interfaces"],
  requirements: ["React", "TypeScript", "AWS"],
  niceToHave: ["GraphQL"],
  matchedSkills: ["React", "TypeScript"],
  missingSkills: ["AWS", "GraphQL"],
};

test("buildTailoredResumeInput keeps missing skills separate from matched evidence", () => {
  const input = buildTailoredResumeInput(profile, job);

  assert.deepEqual(input.job, {
    targetRole: "Frontend Engineer at Healthware",
    title: "Frontend Engineer",
    company: "Healthware",
    aboutRole: "Build patient-facing workflow tools.",
    responsibilities: ["Create accessible React interfaces"],
    requirements: ["React", "TypeScript", "AWS"],
    niceToHave: ["GraphQL"],
    matchedSkills: ["React", "TypeScript"],
    missingSkills: ["AWS", "GraphQL"],
    visibleJobSignals: [
      "Frontend Engineer",
      "Build patient-facing workflow tools.",
      "React",
      "TypeScript",
      "AWS",
      "Create accessible React interfaces",
      "GraphQL",
    ],
    descriptionNote:
      "Saved Adzuna job descriptions may be snippets. Do not infer requirements or company facts that are not visible here.",
  });
});

test("buildTailoredResumePrompt warns that Adzuna descriptions may be snippets", () => {
  const prompt = buildTailoredResumePrompt(profile, job);

  assert.match(prompt, /missingSkills are gaps only/);
  assert.match(prompt, /Saved Adzuna descriptions may be snippets/);
  assert.match(prompt, /Never invent employers, technologies/);
  assert.match(prompt, /visibly job-specific/);
  assert.match(prompt, /requirements and responsibilities are empty/);
  assert.match(prompt, /visibleJobSignals/);
});

test("sanitizeTailoredResumeContent removes bullets claiming missing skills", () => {
  const content = sanitizeTailoredResumeContent(
    {
      professionalSummary:
            "Full Stack Developer with React and PostgreSQL experience in healthcare tools.",
      roles: [
        {
          bullets: [
            "Built React dashboards for care teams",
            "Supported PostgreSQL-backed workflow tools",
            "Delivered AWS infrastructure for production systems",
          ],
        },
      ],
    },
    { roleCount: 1, forbiddenTerms: job.missingSkills },
  );

  assert.deepEqual(content.roles[0].bullets, [
    "Built React dashboards for care teams",
    "Supported PostgreSQL-backed workflow tools",
  ]);
});

test("sanitizeTailoredResumeContent rejects missing-skill claims in summary", () => {
  assert.throws(
    () =>
      sanitizeTailoredResumeContent(
        {
          professionalSummary:
            "Frontend Engineer with React, TypeScript, and AWS experience.",
          roles: [
            {
              bullets: [
                "Built React interfaces",
                "Supported TypeScript application workflows",
              ],
            },
          ],
        },
        { roleCount: 1, forbiddenTerms: job.missingSkills },
      ),
    /missing skill/,
  );
});

test("sanitizeTailoredResumeContent requires bullets for every profile role", () => {
  assert.throws(
    () =>
      sanitizeTailoredResumeContent(
        {
          professionalSummary: "Developer with grounded profile experience.",
          roles: [],
        },
        { roleCount: 1 },
      ),
    /role 1/,
  );
});

test("sanitizeTailoredResumeContent rejects single-bullet roles after filtering", () => {
  assert.throws(
    () =>
      sanitizeTailoredResumeContent(
        {
          professionalSummary: "Developer with grounded profile experience.",
          roles: [
            {
              bullets: [
                "Built React interfaces",
                "Delivered AWS infrastructure",
              ],
            },
          ],
        },
        { roleCount: 1, forbiddenTerms: job.missingSkills },
      ),
    /at least 2 bullets/,
  );
});

test("extractFirstJsonObject skips incidental invalid braces", () => {
  const json = extractFirstJsonObject(
    'Draft note {not json}: {"professionalSummary":"Grounded summary","roles":[]}',
  );

  assert.equal(
    json,
    '{"professionalSummary":"Grounded summary","roles":[]}',
  );
});
