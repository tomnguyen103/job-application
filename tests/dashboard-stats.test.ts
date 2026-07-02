import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeDashboardStatValues,
  type DashboardJobStatsAggregateRow,
} from "../lib/dashboard-stats";

test("computeDashboardStatValues handles an empty account", () => {
  const result = computeDashboardStatValues({
    aggregate: {
      total_jobs_found: 0,
      avg_match_rate: null,
      companies_researched: 0,
    },
    jobsThisWeekCount: 0,
  });

  assert.deepEqual(result, {
    totalJobsFound: 0,
    avgMatchRate: null,
    companiesResearched: 0,
    jobsThisWeek: 0,
  });
});

test("computeDashboardStatValues rounds aggregate match score", () => {
  const aggregate: DashboardJobStatsAggregateRow = {
    total_jobs_found: 3,
    avg_match_rate: 81.4,
    companies_researched: 1,
  };

  const result = computeDashboardStatValues({
    aggregate,
    jobsThisWeekCount: 2,
  });

  assert.equal(result.avgMatchRate, 81);
  assert.equal(result.totalJobsFound, 3);
  assert.equal(result.companiesResearched, 1);
  assert.equal(result.jobsThisWeek, 2);
});

test("computeDashboardStatValues accepts numeric strings from RPC results", () => {
  const aggregate: DashboardJobStatsAggregateRow = {
    total_jobs_found: "41",
    avg_match_rate: "90.5",
    companies_researched: "3",
  };

  const result = computeDashboardStatValues({
    aggregate,
    jobsThisWeekCount: 7,
  });

  assert.deepEqual(result, {
    totalJobsFound: 41,
    avgMatchRate: 91,
    companiesResearched: 3,
    jobsThisWeek: 7,
  });
});

test("computeDashboardStatValues treats invalid aggregate numbers as zero or empty", () => {
  const result = computeDashboardStatValues({
    aggregate: {
      total_jobs_found: "not-a-number",
      avg_match_rate: Number.NaN,
      companies_researched: null,
    },
    jobsThisWeekCount: null,
  });

  assert.deepEqual(result, {
    totalJobsFound: 0,
    avgMatchRate: null,
    companiesResearched: 0,
    jobsThisWeek: 0,
  });
});

test("computeDashboardStatValues clamps negative counts at zero", () => {
  const result = computeDashboardStatValues({
    aggregate: {
      total_jobs_found: -2,
      avg_match_rate: null,
      companies_researched: -5,
    },
    jobsThisWeekCount: -1,
  });

  assert.equal(result.totalJobsFound, 0);
  assert.equal(result.companiesResearched, 0);
  assert.equal(result.jobsThisWeek, 0);
});
