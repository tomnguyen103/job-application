import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveTailoredResumeDownload,
  type TailoredResumeDownloadClient,
} from "../lib/tailored-resume-download";
import { TAILORED_RESUME_BUCKET } from "../lib/tailored-resume";

type JobRow = {
  id: string;
};

type ResumeRow = {
  id: string;
  storage_key: string;
  file_name: string | null;
  generated_at: string;
  expires_at: string;
};

type Call =
  | { table: "jobs" | "tailored_resumes"; method: "select"; value: string }
  | {
      table: "jobs" | "tailored_resumes";
      method: "eq" | "gt";
      column: string;
      value: string;
    }
  | {
      table: "tailored_resumes";
      method: "order";
      column: string;
      ascending: boolean;
    }
  | { table: "tailored_resumes"; method: "limit"; value: number }
  | { table: "jobs" | "tailored_resumes"; method: "maybeSingle" }
  | { table: "storage"; method: "from"; value: string }
  | { table: "storage"; method: "download"; value: string };

type Scenario = {
  jobRow: JobRow | null;
  jobError?: unknown;
  resumeRow: ResumeRow | null;
  resumeError?: unknown;
  blob?: Blob | null;
  downloadError?: unknown;
};

function defaultScenario(): Scenario {
  return {
    jobRow: { id: "job-1" },
    resumeRow: {
      id: "resume-new",
      storage_key: "user-1/job-1/resume-new.pdf",
      file_name: 'tailored resume "final".pdf',
      generated_at: "2026-06-12T12:00:00.000Z",
      expires_at: "2026-06-27T12:00:00.000Z",
    },
    blob: new Blob(["pdf"], { type: "application/pdf" }),
  };
}

class FakeJobQuery {
  constructor(
    private readonly scenario: Scenario,
    private readonly calls: Call[],
  ) {}

  select(value: string): FakeJobQuery {
    this.calls.push({ table: "jobs", method: "select", value });
    return this;
  }

  eq(column: string, value: string): FakeJobQuery {
    this.calls.push({ table: "jobs", method: "eq", column, value });
    return this;
  }

  async maybeSingle(): Promise<{ data: JobRow | null; error: unknown | null }> {
    this.calls.push({ table: "jobs", method: "maybeSingle" });
    return {
      data: this.scenario.jobRow,
      error: this.scenario.jobError ?? null,
    };
  }
}

class FakeResumeQuery {
  constructor(
    private readonly scenario: Scenario,
    private readonly calls: Call[],
  ) {}

  select(value: string): FakeResumeQuery {
    this.calls.push({ table: "tailored_resumes", method: "select", value });
    return this;
  }

  eq(column: string, value: string): FakeResumeQuery {
    this.calls.push({ table: "tailored_resumes", method: "eq", column, value });
    return this;
  }

  gt(column: string, value: string): FakeResumeQuery {
    this.calls.push({ table: "tailored_resumes", method: "gt", column, value });
    return this;
  }

  order(column: string, options: { ascending: boolean }): FakeResumeQuery {
    this.calls.push({
      table: "tailored_resumes",
      method: "order",
      column,
      ascending: options.ascending,
    });
    return this;
  }

  limit(value: number): FakeResumeQuery {
    this.calls.push({ table: "tailored_resumes", method: "limit", value });
    return this;
  }

  async maybeSingle(): Promise<{
    data: ResumeRow | null;
    error: unknown | null;
  }> {
    this.calls.push({ table: "tailored_resumes", method: "maybeSingle" });
    return {
      data: this.scenario.resumeRow,
      error: this.scenario.resumeError ?? null,
    };
  }
}

function fakeClient(
  scenarioOverrides: Partial<Scenario> = {},
): { client: TailoredResumeDownloadClient; calls: Call[] } {
  const scenario = { ...defaultScenario(), ...scenarioOverrides };
  const calls: Call[] = [];

  return {
    calls,
    client: {
      database: {
        from(table: "jobs" | "tailored_resumes") {
          return table === "jobs"
            ? new FakeJobQuery(scenario, calls)
            : new FakeResumeQuery(scenario, calls);
        },
      },
      storage: {
        from(bucket: typeof TAILORED_RESUME_BUCKET) {
          calls.push({ table: "storage", method: "from", value: bucket });
          return {
            async download(key: string) {
              calls.push({ table: "storage", method: "download", value: key });
              return {
                data: scenario.blob ?? null,
                error: scenario.downloadError ?? null,
              };
            },
          };
        },
      },
    },
  };
}

test("resolveTailoredResumeDownload returns 401 before DB access without a user", async () => {
  const { client, calls } = fakeClient();

  const result = await resolveTailoredResumeDownload({
    user: null,
    jobId: "job-1",
    insforge: client,
  });

  assert.equal(result.status, 401);
  assert.deepEqual(calls, []);
});

test("resolveTailoredResumeDownload returns 404 for inaccessible jobs", async () => {
  const { client, calls } = fakeClient({ jobRow: null });

  const result = await resolveTailoredResumeDownload({
    user: { id: "user-1" },
    jobId: "job-1",
    insforge: client,
  });

  assert.equal(result.status, 404);
  assert.ok(
    calls.some(
      (call) =>
        call.method === "eq" &&
        call.table === "jobs" &&
        call.column === "user_id" &&
        call.value === "user-1",
    ),
  );
  assert.equal(
    calls.some((call) => call.table === "storage"),
    false,
  );
});

test("resolveTailoredResumeDownload returns 404 when no unexpired resume exists", async () => {
  const { client, calls } = fakeClient({ resumeRow: null });
  const now = new Date("2026-06-13T12:00:00.000Z");

  const result = await resolveTailoredResumeDownload({
    user: { id: "user-1" },
    jobId: "job-1",
    insforge: client,
    now,
  });

  assert.equal(result.status, 404);
  assert.ok(
    calls.some(
      (call) =>
        call.method === "gt" &&
        call.table === "tailored_resumes" &&
        call.column === "expires_at" &&
        call.value === now.toISOString(),
    ),
  );
  assert.equal(
    calls.some((call) => call.table === "storage"),
    false,
  );
});

test("resolveTailoredResumeDownload streams the latest unexpired resume", async () => {
  const { client, calls } = fakeClient();

  const result = await resolveTailoredResumeDownload({
    user: { id: "user-1" },
    jobId: "job-1",
    insforge: client,
    now: new Date("2026-06-13T12:00:00.000Z"),
  });

  assert.equal(result.status, 200);
  if (result.status !== 200) {
    throw new Error("expected a successful download result");
  }
  assert.equal(result.fileName, "tailored-resume--final-.pdf");
  assert.equal(await result.blob.text(), "pdf");
  assert.ok(
    calls.some(
      (call) =>
        call.method === "order" &&
        call.table === "tailored_resumes" &&
        call.column === "generated_at" &&
        call.ascending === false,
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.method === "from" &&
        call.table === "storage" &&
        call.value === TAILORED_RESUME_BUCKET,
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.method === "download" &&
        call.table === "storage" &&
        call.value === "user-1/job-1/resume-new.pdf",
    ),
  );
});

test("resolveTailoredResumeDownload returns 500 for storage download errors", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const { client, calls } = fakeClient({
      downloadError: new Error("storage unavailable"),
    });

    const result = await resolveTailoredResumeDownload({
      user: { id: "user-1" },
      jobId: "job-1",
      insforge: client,
      now: new Date("2026-06-13T12:00:00.000Z"),
    });

    assert.equal(result.status, 500);
    if (result.status === 200) {
      throw new Error("expected an error result");
    }
    assert.equal(
      result.body.error,
      "Failed to download the tailored resume. Please try again.",
    );
    assert.ok(
      calls.some(
        (call) =>
          call.method === "from" &&
          call.table === "storage" &&
          call.value === TAILORED_RESUME_BUCKET,
      ),
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("resolveTailoredResumeDownload returns 404 for missing storage blobs", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const { client } = fakeClient({ blob: null });

    const result = await resolveTailoredResumeDownload({
      user: { id: "user-1" },
      jobId: "job-1",
      insforge: client,
      now: new Date("2026-06-13T12:00:00.000Z"),
    });

    assert.equal(result.status, 404);
    if (result.status === 200) {
      throw new Error("expected an error result");
    }
    assert.equal(result.body.error, "No unexpired tailored resume found.");
  } finally {
    console.error = originalConsoleError;
  }
});
