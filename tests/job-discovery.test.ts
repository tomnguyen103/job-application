import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dedupePostings,
  searchProviders,
  selectPostingsForScoring,
} from "../agent/job-discovery-utils";
import type {
  JobSourceProvider,
  NormalizedJobPosting,
} from "../agent/types";

function posting(
  overrides: Partial<NormalizedJobPosting> = {},
): NormalizedJobPosting {
  return {
    provider: "remotive",
    sourceDisplayName: "Remotive",
    providerJobId: "job-1",
    title: "Frontend Engineer",
    company: "Acme",
    location: "Remote",
    description: "Build product UI.",
    sourceUrl: "https://remotive.com/jobs/1",
    applyUrl: "https://remotive.com/jobs/1?apply=true",
    salary: null,
    jobType: null,
    postedAt: null,
    metadata: {},
    ...overrides,
  };
}

test("provider search tolerates partial source failure", async () => {
  const providers: JobSourceProvider[] = [
    {
      key: "remotive",
      displayName: "Remotive",
      isConfigured: () => true,
      search: async () => [posting()],
    },
    {
      key: "usajobs",
      displayName: "USAJOBS",
      isConfigured: () => true,
      search: async () => {
        throw new Error("rate limited");
      },
    },
    {
      key: "greenhouse",
      displayName: "Greenhouse",
      isConfigured: () => false,
      search: async () => [posting()],
    },
  ];

  const outcomes = await searchProviders(providers, {
    jobTitle: "Frontend Engineer",
    location: "Remote",
    limit: 10,
  });

  assert.strictEqual(outcomes[0].postings.length, 1);
  assert.strictEqual(outcomes[1].error, "rate limited");
  assert.strictEqual(
    outcomes[2].error,
    "Source is enabled but not configured.",
  );
});

test("dedupe removes existing provider IDs, existing URLs, and same-run duplicates", () => {
  const existingRows = [
    {
      source_url: "https://remotive.com/jobs/old",
      source_provider: "remotive",
      source_provider_job_id: "existing-id",
    },
  ];

  const { newPostings, skippedDuplicates } = dedupePostings(
    [
      posting({
        providerJobId: "existing-id",
        sourceUrl: "https://remotive.com/jobs/new",
      }),
      posting({
        providerJobId: "fresh-id",
        sourceUrl: "https://remotive.com/jobs/old",
      }),
      posting({
        providerJobId: "fresh-id",
        sourceUrl: "https://remotive.com/jobs/fresh",
      }),
      posting({
        providerJobId: "fresh-id",
        sourceUrl: "https://remotive.com/jobs/fresh",
      }),
    ],
    existingRows,
  );

  assert.strictEqual(skippedDuplicates, 3);
  assert.strictEqual(newPostings.length, 1);
  assert.strictEqual(newPostings[0].sourceUrl, "https://remotive.com/jobs/fresh");
});

test("score selection caps postings and reports quota skips", () => {
  const items = [
    posting({ providerJobId: "1" }),
    posting({ providerJobId: "2" }),
    posting({ providerJobId: "3" }),
  ];

  const selected = selectPostingsForScoring(items, 2);

  assert.deepStrictEqual(
    selected.jobsToScore.map((item) => item.providerJobId),
    ["1", "2"],
  );
  assert.strictEqual(selected.skippedForQuota, 1);
});
