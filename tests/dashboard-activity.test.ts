import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildRecentActivityItems,
  type CompletedRunRow,
  type ResearchedJobRow,
} from "../lib/dashboard-activity";

function run(overrides: Partial<CompletedRunRow>): CompletedRunRow {
  return {
    id: "run-id",
    job_title_searched: "Frontend Engineer",
    jobs_found: 8,
    completed_at: "2026-06-10T10:00:00.000Z",
    started_at: "2026-06-10T09:59:00.000Z",
    ...overrides,
  };
}

function researched(overrides: Partial<ResearchedJobRow>): ResearchedJobRow {
  return {
    id: "job-id",
    company: "Stripe",
    researched_at: "2026-06-10T11:00:00.000Z",
    ...overrides,
  };
}

test("buildRecentActivityItems merges and sorts newest first", () => {
  const items = buildRecentActivityItems({
    runs: [
      run({ id: "r1", completed_at: "2026-06-10T08:00:00.000Z" }),
      run({
        id: "r2",
        job_title_searched: "React Developer",
        jobs_found: 12,
        completed_at: "2026-06-10T12:00:00.000Z",
      }),
    ],
    researchedJobs: [
      researched({ id: "j1", researched_at: "2026-06-10T10:30:00.000Z" }),
    ],
  });

  assert.deepEqual(
    items.map((item) => item.id),
    ["run-r2", "research-j1", "run-r1"],
  );
  assert.equal(items[0].title, "Found 12 jobs for React Developer");
  assert.equal(items[0].tone, "success");
  assert.equal(items[1].title, "Researched Stripe");
  assert.equal(items[1].tone, "info");
});

test("buildRecentActivityItems caps results at the limit", () => {
  const runs = Array.from({ length: 8 }, (_, index) =>
    run({
      id: `r${index}`,
      completed_at: `2026-06-0${(index % 9) + 1}T10:00:00.000Z`,
    }),
  );

  const items = buildRecentActivityItems({ runs, researchedJobs: [] });

  assert.equal(items.length, 5);
});

test("buildRecentActivityItems uses singular wording and fallbacks", () => {
  const items = buildRecentActivityItems({
    runs: [
      run({
        id: "r1",
        jobs_found: 1,
        job_title_searched: "  ",
        completed_at: null,
        started_at: "2026-06-10T09:00:00.000Z",
      }),
    ],
    researchedJobs: [],
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Found 1 job for your search");
  assert.equal(items[0].occurredAt, "2026-06-10T09:00:00.000Z");
});

test("buildRecentActivityItems skips rows without usable data", () => {
  const items = buildRecentActivityItems({
    runs: [run({ id: "r1", completed_at: null, started_at: null })],
    researchedJobs: [
      researched({ id: "j1", company: null }),
      researched({ id: "j2", researched_at: null }),
      researched({ id: "j3", researched_at: "not-a-date" }),
    ],
  });

  assert.deepEqual(items, []);
});
