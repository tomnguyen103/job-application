import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveSourceDisplayName } from "../lib/utils";

test("resolveSourceDisplayName prefers a non-empty saved display name", () => {
  assert.equal(resolveSourceDisplayName("  Custom ATS  ", "adzuna"), "Custom ATS");
});

test("resolveSourceDisplayName maps known providers", () => {
  assert.equal(resolveSourceDisplayName(null, "adzuna"), "Adzuna");
  assert.equal(resolveSourceDisplayName(null, "remotive"), "Remotive");
  assert.equal(resolveSourceDisplayName(null, "usajobs"), "USAJOBS");
  assert.equal(resolveSourceDisplayName(null, "greenhouse"), "Greenhouse");
  assert.equal(resolveSourceDisplayName(null, "lever"), "Lever");
  assert.equal(resolveSourceDisplayName(null, "ashby"), "Ashby");
  assert.equal(resolveSourceDisplayName(null, "manual"), "Manual import");
});

test("resolveSourceDisplayName does not relabel unknown providers as Adzuna", () => {
  assert.equal(resolveSourceDisplayName("", "unknown-provider"), "Unknown source");
  assert.equal(resolveSourceDisplayName(null, null), "Unknown source");
});
