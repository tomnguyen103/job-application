import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeAdzunaJob } from "../agent/job-sources/adzuna";
import { parseAtsBoards, parseEnabledSourceKeys } from "../agent/job-sources";
import { normalizeRemotiveJob } from "../agent/job-sources/remotive";
import { normalizeUsaJobsItem } from "../agent/job-sources/usajobs";
import { normalizeGreenhouseJob } from "../agent/job-sources/greenhouse";
import { normalizeLeverJob } from "../agent/job-sources/lever";
import { normalizeAshbyJob } from "../agent/job-sources/ashby";
import type { UsableAdzunaJob } from "../agent/types";

test("source config defaults to free search providers and ignores unknown keys", () => {
  assert.deepStrictEqual(parseEnabledSourceKeys(""), [
    "adzuna",
    "remotive",
    "usajobs",
  ]);

  assert.deepStrictEqual(
    parseEnabledSourceKeys("adzuna,unknown,lever,remotive,adzuna"),
    ["adzuna", "lever", "remotive"],
  );
});

test("ATS board config parses supported provider slugs", () => {
  assert.deepStrictEqual(
    parseAtsBoards("greenhouse:openai, lever:anthropic, nope:x, ashby:acme"),
    [
      { provider: "greenhouse", slug: "openai" },
      { provider: "lever", slug: "anthropic" },
      { provider: "ashby", slug: "acme" },
    ],
  );
});

test("Adzuna normalization preserves canonical URL and attribution", () => {
  const job: UsableAdzunaJob = {
    title: "Frontend Engineer",
    description: "Build product UI",
    redirect_url: "https://www.adzuna.com/details/123?se=tracking",
    company: { display_name: "Acme" },
    location: { display_name: "Remote, US" },
    salary_min: 120000,
    salary_max: 150000,
    contract_type: "full_time",
    created: "2026-06-01T00:00:00Z",
  };

  const normalized = normalizeAdzunaJob(job);

  assert.strictEqual(
    normalized.sourceUrl,
    "https://www.adzuna.com/details/123",
  );
  assert.strictEqual(normalized.applyUrl, job.redirect_url);
  assert.strictEqual(normalized.sourceDisplayName, "Adzuna");
  assert.strictEqual(normalized.salary, "$120k - $150k");
});

test("Remotive normalization filters missing required fields and strips HTML", () => {
  assert.strictEqual(
    normalizeRemotiveJob({
      title: "Backend Engineer",
      company_name: "",
      description: "API work",
      url: "https://remotive.com/jobs/1",
    }),
    null,
  );

  const normalized = normalizeRemotiveJob({
    id: 42,
    title: "Backend Engineer",
    company_name: "RemoteCo",
    description: "<p>Build &amp; operate APIs</p>",
    url: "https://remotive.com/jobs/backend?ref=feed",
    candidate_required_location: "Worldwide",
    job_type: "full_time",
    salary: "$100k",
  });

  assert.ok(normalized);
  assert.strictEqual(normalized.description, "Build & operate APIs");
  assert.strictEqual(normalized.providerJobId, "42");
  assert.strictEqual(normalized.sourceUrl, "https://remotive.com/jobs/backend");
  assert.strictEqual(normalized.sourceDisplayName, "Remotive");
});

test("USAJOBS normalization reads nested federal search fields", () => {
  const normalized = normalizeUsaJobsItem({
    MatchedObjectDescriptor: {
      PositionID: "USA-123",
      PositionTitle: "Software Developer",
      OrganizationName: "Department of Testing",
      PositionURI: "https://www.usajobs.gov/job/123?utm=feed",
      PositionLocationDisplay: "Washington, DC",
      PublicationStartDate: "2026-06-20T00:00:00Z",
      PositionSchedule: [{ Name: "Full-time" }],
      PositionRemuneration: [
        {
          MinimumRange: "100000",
          MaximumRange: "140000",
          RateIntervalCode: "Per Year",
        },
      ],
      UserArea: {
        Details: {
          JobSummary: "Build public-sector software.",
        },
      },
    },
  });

  assert.ok(normalized);
  assert.strictEqual(normalized.provider, "usajobs");
  assert.strictEqual(normalized.providerJobId, "USA-123");
  assert.strictEqual(normalized.salary, "$100000 - $140000 Per Year");
  assert.strictEqual(normalized.sourceUrl, "https://www.usajobs.gov/job/123");
});

test("Greenhouse normalization derives company from board slug and falls back on missing location", () => {
  assert.strictEqual(
    normalizeGreenhouseJob({ title: "", content: "x", absolute_url: "https://x.com" }, "acme"),
    null,
  );

  const normalized = normalizeGreenhouseJob(
    {
      id: 555,
      title: "Platform Engineer",
      content: "<p>Build the platform</p>",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/555?gh_src=feed",
      updated_at: "2026-06-01T00:00:00Z",
      // location intentionally omitted — Greenhouse sometimes returns no location object
    },
    "acme-corp",
  );

  assert.ok(normalized);
  assert.strictEqual(normalized.company, "Acme Corp");
  assert.strictEqual(normalized.location, "Not specified");
  assert.strictEqual(normalized.description, "Build the platform");
  assert.strictEqual(normalized.providerJobId, "555");
  assert.strictEqual(
    normalized.sourceUrl,
    "https://boards.greenhouse.io/acme/jobs/555",
  );
});

test("Lever normalization reads commitment/location from categories and falls back on missing location", () => {
  assert.strictEqual(
    normalizeLeverJob({ text: "", descriptionPlain: "x", hostedUrl: "https://x.com" }, "acme"),
    null,
  );

  const normalized = normalizeLeverJob(
    {
      id: "lever-123",
      text: "Backend Engineer",
      descriptionPlain: "Own the API layer.",
      hostedUrl: "https://jobs.lever.co/acme/lever-123?lever-source=feed",
      createdAt: 1_717_200_000_000,
      categories: { commitment: "Full-time" },
      // categories.location intentionally omitted
    },
    "acme",
  );

  assert.ok(normalized);
  assert.strictEqual(normalized.location, "Not specified");
  assert.strictEqual(normalized.jobType, "Full-time");
  assert.strictEqual(normalized.providerJobId, "lever-123");
  assert.strictEqual(
    normalized.sourceUrl,
    "https://jobs.lever.co/acme/lever-123",
  );
});

test("Ashby normalization prefers jobUrl and falls back on missing location", () => {
  assert.strictEqual(
    normalizeAshbyJob({ title: "", description: "x" }, "acme"),
    null,
  );

  const normalized = normalizeAshbyJob(
    {
      id: "ashby-1",
      title: "Data Engineer",
      descriptionHtml: "<p>Own the warehouse.</p>",
      jobUrl: "https://jobs.ashbyhq.com/acme/ashby-1?utm_source=feed",
      publishedAt: "2026-06-01T00:00:00Z",
      employmentType: "FullTime",
      // locationName and location intentionally omitted
    },
    "acme",
  );

  assert.ok(normalized);
  assert.strictEqual(normalized.location, "Not specified");
  assert.strictEqual(normalized.jobType, "FullTime");
  assert.strictEqual(normalized.applyUrl, "https://jobs.ashbyhq.com/acme/ashby-1?utm_source=feed");
  assert.strictEqual(
    normalized.sourceUrl,
    "https://jobs.ashbyhq.com/acme/ashby-1",
  );
});
