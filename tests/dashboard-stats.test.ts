import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeDashboardStatValues,
  type DashboardJobStatRow,
} from "../lib/dashboard-stats";

const NOW = new Date("2026-06-10T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

test("computeDashboardStatValues handles an empty account", () => {
  const result = computeDashboardStatValues({
    rows: [],
    totalCount: 0,
    unresearchedCount: 0,
    now: NOW,
  });

  assert.deepEqual(result, {
    totalJobsFound: 0,
    avgMatchRate: null,
    companiesResearched: 0,
    jobsThisWeek: 0,
  });
});

test("computeDashboardStatValues averages and rounds match scores", () => {
  const rows: DashboardJobStatRow[] = [
    { match_score: 88, found_at: daysAgo(1) },
    { match_score: 75, found_at: daysAgo(2) },
    { match_score: 80, found_at: daysAgo(3) },
  ];

  const result = computeDashboardStatValues({
    rows,
    totalCount: 3,
    unresearchedCount: 2,
    now: NOW,
  });

  assert.equal(result.avgMatchRate, 81);
  assert.equal(result.totalJobsFound, 3);
  assert.equal(result.companiesResearched, 1);
});

test("computeDashboardStatValues ignores null scores and dates", () => {
  const rows: DashboardJobStatRow[] = [
    { match_score: null, found_at: null },
    { match_score: 90, found_at: daysAgo(1) },
    { match_score: null, found_at: "not-a-date" },
  ];

  const result = computeDashboardStatValues({
    rows,
    totalCount: 3,
    unresearchedCount: 3,
    now: NOW,
  });

  assert.equal(result.avgMatchRate, 90);
  assert.equal(result.jobsThisWeek, 1);
  assert.equal(result.companiesResearched, 0);
});

test("computeDashboardStatValues counts only jobs found in the last 7 days", () => {
  const rows: DashboardJobStatRow[] = [
    { match_score: 70, found_at: daysAgo(0) },
    { match_score: 70, found_at: daysAgo(6) },
    { match_score: 70, found_at: daysAgo(8) },
    { match_score: 70, found_at: daysAgo(30) },
  ];

  const result = computeDashboardStatValues({
    rows,
    totalCount: 4,
    unresearchedCount: 4,
    now: NOW,
  });

  assert.equal(result.jobsThisWeek, 2);
});

test("computeDashboardStatValues clamps researched count at zero", () => {
  const result = computeDashboardStatValues({
    rows: [],
    totalCount: 2,
    unresearchedCount: 5,
    now: NOW,
  });

  assert.equal(result.companiesResearched, 0);
});
