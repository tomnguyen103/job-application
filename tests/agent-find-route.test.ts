import assert from "node:assert/strict";
import { test } from "node:test";

import type { DiscoveryResult } from "../agent/types";
import {
  resolveAgentFindRoute,
  type ResolveAgentFindRouteArgs,
} from "../lib/agent-find-route";
import type { ProfileRow } from "../types";

type InsforgeClient = NonNullable<ResolveAgentFindRouteArgs["insforge"]>;
type TableName = "profiles" | "agent_runs";

type Call =
  | { table: TableName; method: "select"; value: string }
  | { table: TableName; method: "eq"; column: string; value: string }
  | { table: TableName; method: "insert"; rows: Record<string, unknown>[] }
  | { table: TableName; method: "single" | "maybeSingle" }
  | { table: TableName; method: "update"; values: Record<string, unknown> };

type Scenario = {
  profileRow: ProfileRow | null;
  profileError?: unknown;
  runData: { id?: string } | null;
  runError?: unknown;
  updateError?: unknown;
};

function completeProfile(): ProfileRow {
  return {
    is_complete: true,
    email: "candidate@example.com",
    skills: ["TypeScript"],
    industries: ["Software"],
    work_experience: [],
    job_titles_seeking: ["Frontend Engineer"],
    preferred_locations: ["Remote"],
  };
}

function defaultScenario(): Scenario {
  return {
    profileRow: completeProfile(),
    runData: { id: "run-1" },
  };
}

class FakeQuery {
  readonly error: unknown | null;

  constructor(
    private readonly table: TableName,
    private readonly scenario: Scenario,
    private readonly calls: Call[],
  ) {
    this.error = scenario.updateError ?? null;
  }

  select(value: string): FakeQuery {
    this.calls.push({ table: this.table, method: "select", value });
    return this;
  }

  eq(column: string, value: string): FakeQuery {
    this.calls.push({ table: this.table, method: "eq", column, value });
    return this;
  }

  insert(rows: Record<string, unknown>[]): FakeQuery {
    this.calls.push({ table: this.table, method: "insert", rows });
    return this;
  }

  update(values: Record<string, unknown>): FakeQuery {
    this.calls.push({ table: this.table, method: "update", values });
    return this;
  }

  async maybeSingle(): Promise<{ data: unknown; error: unknown | null }> {
    this.calls.push({ table: this.table, method: "maybeSingle" });
    return {
      data: this.scenario.profileRow,
      error: this.scenario.profileError ?? null,
    };
  }

  async single(): Promise<{ data: unknown; error: unknown | null }> {
    this.calls.push({ table: this.table, method: "single" });
    return {
      data: this.scenario.runData,
      error: this.scenario.runError ?? null,
    };
  }
}

function fakeClient(scenarioOverrides: Partial<Scenario> = {}): {
  client: InsforgeClient;
  calls: Call[];
} {
  const scenario = { ...defaultScenario(), ...scenarioOverrides };
  const calls: Call[] = [];
  const client = {
    database: {
      from(table: TableName) {
        return new FakeQuery(table, scenario, calls);
      },
    },
  } as unknown as InsforgeClient;

  return { client, calls };
}

function successfulDiscovery(): DiscoveryResult {
  return {
    found: 1,
    saved: 1,
    strongMatches: 1,
    savedJobs: [
      {
        id: "job-1",
        matchScore: 86,
        sourceProvider: "remotive",
        sourceDisplayName: "Remotive",
      },
    ],
    sources: [
      {
        provider: "remotive",
        displayName: "Remotive",
        found: 1,
        saved: 1,
        strongMatches: 1,
      },
    ],
    skippedDuplicates: 0,
    skippedForQuota: 0,
  };
}

test("resolveAgentFindRoute returns 401 before DB access without a user", async () => {
  const { client, calls } = fakeClient();

  const result = await resolveAgentFindRoute({
    user: null,
    insforge: client,
    body: { jobTitle: "Frontend Engineer" },
  });

  assert.strictEqual(result.status, 401);
  assert.deepStrictEqual(calls, []);
});

test("resolveAgentFindRoute returns profile gate before starting a run", async () => {
  const { client, calls } = fakeClient({
    profileRow: { ...completeProfile(), is_complete: false },
  });
  let quotaChecked = false;

  const result = await resolveAgentFindRoute({
    user: { id: "user-1", email: "candidate@example.com" },
    insforge: client,
    body: { jobTitle: "Frontend Engineer" },
    checkQuotaAvailable: async () => {
      quotaChecked = true;
      return { allowed: true, current: 0, limit: 10, planKey: "free" };
    },
  });

  assert.strictEqual(result.status, 400);
  assert.strictEqual(quotaChecked, false);
  assert.equal(calls.some((call) => call.method === "insert"), false);
});

test("resolveAgentFindRoute returns 402 and finalizes the run when score quota is exhausted", async () => {
  const { client, calls } = fakeClient();
  let searchReserved = false;

  const result = await resolveAgentFindRoute({
    user: { id: "user-1", email: "candidate@example.com" },
    insforge: client,
    body: { jobTitle: "Frontend Engineer" },
    checkQuotaAvailable: async () => ({
      allowed: false,
      current: 10,
      limit: 10,
      planKey: "free",
    }),
    recordUsage: async () => {
      searchReserved = true;
      return { success: true };
    },
  });

  assert.strictEqual(result.status, 402);
  assert.strictEqual(result.body.code, "QUOTA_EXCEEDED");
  assert.strictEqual(searchReserved, false);
  assert.equal(
    calls.some(
      (call) =>
        call.method === "update" &&
        call.values.status === "failed" &&
        call.values.jobs_found === 0,
    ),
    true,
  );
});

test("resolveAgentFindRoute finalizes the run when discovery throws", async (t) => {
  t.mock.method(console, "error", () => {});
  const { client, calls } = fakeClient();

  const result = await resolveAgentFindRoute({
    user: { id: "user-1", email: "candidate@example.com" },
    insforge: client,
    body: { jobTitle: "Frontend Engineer" },
    checkQuotaAvailable: async () => ({
      allowed: true,
      current: 0,
      limit: 10,
      planKey: "free",
    }),
    recordUsage: async () => ({ success: true }),
    discoverJobs: async () => {
      throw new Error("provider outage");
    },
  });

  assert.strictEqual(result.status, 500);
  assert.equal(
    calls.some(
      (call) =>
        call.method === "update" &&
        call.values.status === "failed" &&
        call.values.jobs_found === 0,
    ),
    true,
  );
});

test("resolveAgentFindRoute does not fail a successful run when analytics rejects", async (t) => {
  t.mock.method(console, "error", () => {});
  const { client } = fakeClient();

  const result = await resolveAgentFindRoute({
    user: { id: "user-1", email: "candidate@example.com" },
    insforge: client,
    body: { jobTitle: "Frontend Engineer", location: "Remote" },
    checkQuotaAvailable: async () => ({
      allowed: true,
      current: 0,
      limit: 10,
      planKey: "free",
    }),
    recordUsage: async () => ({ success: true }),
    discoverJobs: async () => ({ success: true, result: successfulDiscovery() }),
    captureJobFoundEvent: async () => {
      throw new Error("posthog unavailable");
    },
  });

  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.revalidatePaths, ["/find-jobs"]);
});
