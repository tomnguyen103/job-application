import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveCompanyTechStack,
  filterCompanyTechStackToEvidence,
} from "../lib/company-research-tech";

test("deriveCompanyTechStack uses company research and explicit job posting technologies", () => {
  const techStack = deriveCompanyTechStack({
    researchTechnologies: ["Cloudflare Workers", "Google Cloud"],
    jobDescription:
      "The team builds internal tools with TypeScript, React, and Terraform.",
  });

  assert.deepEqual(techStack, [
    "Cloudflare",
    "Google Cloud Platform",
    "TypeScript",
    "React",
    "Terraform",
  ]);
});

test("filterCompanyTechStackToEvidence removes resume-only skills from model output", () => {
  const techStack = filterCompanyTechStackToEvidence(
    ["JavaScript", "TypeScript", "AWS", "Snowflake"],
    {
      researchTechnologies: [],
      jobDescription:
        "This role supports analytics platforms using Snowflake and Tableau.",
    },
  );

  assert.deepEqual(techStack, ["Snowflake"]);
});

test("filterCompanyTechStackToEvidence returns no tech stack when there is no company or job evidence", () => {
  const techStack = filterCompanyTechStackToEvidence(
    ["JavaScript", "TypeScript", "AWS"],
    {
      researchTechnologies: [],
      jobDescription: "This role supports business process improvements.",
    },
  );

  assert.deepEqual(techStack, []);
});

test("filterCompanyTechStackToEvidence falls back to evidence when model output is all resume skills", () => {
  const techStack = filterCompanyTechStackToEvidence(
    ["JavaScript", "TypeScript", "AWS"],
    {
      researchTechnologies: ["Workday"],
      jobDescription: "The posting mentions Salesforce administration.",
    },
  );

  assert.deepEqual(techStack, ["Workday", "Salesforce"]);
});
