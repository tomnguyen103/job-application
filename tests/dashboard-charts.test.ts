import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDailySeries,
  buildMatchDistribution,
  computeYAxis,
  hasAnyCount,
  MATCH_DISTRIBUTION_RANGES,
} from "../lib/dashboard-charts";

// 2026-06-10 is a Wednesday (UTC).
const NOW = new Date("2026-06-10T12:00:00.000Z");

test("buildDailySeries fills missing days with zero, oldest first", () => {
  const points = buildDailySeries({
    rows: [
      { day: "2026-06-09", count: 40 },
      { day: "2026-06-10", count: 11 },
    ],
    days: 7,
    now: NOW,
    labelStyle: "weekday",
  });

  assert.deepEqual(points, [
    { day: "Thu", count: 0 },
    { day: "Fri", count: 0 },
    { day: "Sat", count: 0 },
    { day: "Sun", count: 0 },
    { day: "Mon", count: 0 },
    { day: "Tue", count: 40 },
    { day: "Wed", count: 11 },
  ]);
});

test("buildDailySeries formats month-day labels", () => {
  const points = buildDailySeries({
    rows: [{ day: "2026-06-10", count: 5 }],
    days: 3,
    now: NOW,
    labelStyle: "monthDay",
  });

  assert.deepEqual(points, [
    { day: "Jun 8", count: 0 },
    { day: "Jun 9", count: 0 },
    { day: "Jun 10", count: 5 },
  ]);
});

test("buildDailySeries ignores days outside the window and sums duplicates", () => {
  const points = buildDailySeries({
    rows: [
      { day: "2026-05-01", count: 99 },
      { day: "2026-06-10", count: 2 },
      { day: "2026-06-10", count: 3 },
    ],
    days: 2,
    now: NOW,
    labelStyle: "weekday",
  });

  assert.deepEqual(points, [
    { day: "Tue", count: 0 },
    { day: "Wed", count: 5 },
  ]);
});

test("buildMatchDistribution buckets scores at the documented edges", () => {
  const points = buildMatchDistribution([
    { score: 49.9, count: 1 },
    { score: 50, count: 2 },
    { score: 59.9, count: 3 },
    { score: 60, count: 4 },
    { score: 89.9, count: 5 },
    { score: 90, count: 6 },
    { score: 100, count: 7 },
  ]);

  assert.deepEqual(points, [
    { range: "<50%", count: 1 },
    { range: "50-60%", count: 5 },
    { range: "60-70%", count: 4 },
    { range: "70-80%", count: 0 },
    { range: "80-90%", count: 5 },
    { range: "90-100%", count: 13 },
  ]);
});

test("buildMatchDistribution clamps out-of-range scores and skips invalid rows", () => {
  const points = buildMatchDistribution([
    { score: -5, count: 8 },
    { score: 105, count: 9 },
    { score: Number.NaN, count: 3 },
    { score: 70, count: Number.NaN },
  ]);

  assert.equal(points[0].count, 8);
  assert.equal(points[5].count, 9);
  assert.equal(points[3].count, 0);
});

test("buildMatchDistribution returns all six zeroed ranges for empty input", () => {
  const points = buildMatchDistribution([]);

  assert.deepEqual(
    points.map((point) => point.range),
    [...MATCH_DISTRIBUTION_RANGES],
  );
  assert.ok(points.every((point) => point.count === 0));
});

test("computeYAxis picks nice five-tick scales", () => {
  assert.deepEqual(computeYAxis(0), {
    domain: [0, 4],
    ticks: [0, 1, 2, 3, 4],
  });
  // Matches the house example axis: ticks [0, 3, 6, 9, 12].
  assert.deepEqual(computeYAxis(12), {
    domain: [0, 12],
    ticks: [0, 3, 6, 9, 12],
  });
  assert.deepEqual(computeYAxis(40), {
    domain: [0, 40],
    ticks: [0, 10, 20, 30, 40],
  });
  assert.deepEqual(computeYAxis(85), {
    domain: [0, 100],
    ticks: [0, 25, 50, 75, 100],
  });
});

test("hasAnyCount detects real data", () => {
  assert.equal(hasAnyCount(null), false);
  assert.equal(hasAnyCount([{ count: 0 }, { count: 0 }]), false);
  assert.equal(hasAnyCount([{ count: 0 }, { count: 2 }]), true);
});
