import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResumeStorageKey,
  defaultResumeStorageKey,
  replaceResumeReferenceIfCurrent,
  resolveResumeStorageKey,
} from "@/lib/resume-storage";

test("profile resume storage keys stay inside the user's prefix", () => {
  assert.equal(defaultResumeStorageKey("user-1"), "user-1/resume.pdf");
  assert.match(
    buildResumeStorageKey("user-1"),
    /^user-1\/resume-[0-9a-f-]{36}\.pdf$/,
  );
});

test("resolveResumeStorageKey rejects keys outside the user's prefix", () => {
  assert.equal(
    resolveResumeStorageKey("user-1", "user-1/resume-new.pdf"),
    "user-1/resume-new.pdf",
  );
  assert.equal(
    resolveResumeStorageKey("user-1", "user-2/resume.pdf"),
    "user-1/resume.pdf",
  );
  assert.equal(resolveResumeStorageKey("user-1", null), "user-1/resume.pdf");
});

test("replaceResumeReferenceIfCurrent inserts a missing profile row", async () => {
  const inserts: unknown[] = [];
  const result = await replaceResumeReferenceIfCurrent(
    {
      database: {
        from(table) {
          assert.equal(table, "profiles");
          return {
            insert(rows) {
              inserts.push(rows);
              return {
                select(columns) {
                  assert.equal(columns, "id");
                  return {
                    async single() {
                      return { data: { id: "user-1" }, error: null };
                    },
                  };
                },
              };
            },
            update() {
              throw new Error("update should not be called");
            },
          };
        },
      },
    },
    {
      userId: "user-1",
      profileExists: false,
      currentResumePdfKey: null,
      nextResumePdfKey: "user-1/resume-new.pdf",
      nextResumePdfUrl: "https://storage/resume-new.pdf",
    },
  );

  assert.deepEqual(result, { status: "saved" });
  assert.equal(inserts.length, 1);

  const insertedRows = inserts[0] as Array<{
    id: string;
    resume_pdf_key: string;
    resume_pdf_url: string;
    updated_at: string;
  }>;
  const [{ updated_at, ...insertedRow }] = insertedRows;
  assert.deepEqual(insertedRow, {
    id: "user-1",
    resume_pdf_key: "user-1/resume-new.pdf",
    resume_pdf_url: "https://storage/resume-new.pdf",
  });
  assert.match(updated_at, /^\d{4}-\d{2}-\d{2}T/);
});

test("replaceResumeReferenceIfCurrent updates only when the saved key matches", async () => {
  const filters: unknown[] = [];
  const result = await replaceResumeReferenceIfCurrent(
    {
      database: {
        from(table) {
          assert.equal(table, "profiles");
          return {
            insert() {
              throw new Error("insert should not be called");
            },
            update() {
              const query = {
                eq(column: string, value: unknown) {
                  filters.push(["eq", column, value]);
                  return query;
                },
                is(column: string, value: null) {
                  filters.push(["is", column, value]);
                  return query;
                },
                select(columns: string) {
                  assert.equal(columns, "id");
                  return {
                    async maybeSingle() {
                      return { data: { id: "user-1" }, error: null };
                    },
                  };
                },
              };
              return query;
            },
          };
        },
      },
    },
    {
      userId: "user-1",
      profileExists: true,
      currentResumePdfKey: "user-1/resume-old.pdf",
      nextResumePdfKey: "user-1/resume-new.pdf",
      nextResumePdfUrl: "https://storage/resume-new.pdf",
    },
  );

  assert.deepEqual(result, { status: "saved" });
  assert.deepEqual(filters, [
    ["eq", "id", "user-1"],
    ["eq", "resume_pdf_key", "user-1/resume-old.pdf"],
  ]);
});

test("replaceResumeReferenceIfCurrent treats a missing update row as stale", async () => {
  const result = await replaceResumeReferenceIfCurrent(
    {
      database: {
        from(table) {
          assert.equal(table, "profiles");
          return {
            insert() {
              throw new Error("insert should not be called");
            },
            update() {
              const query = {
                eq() {
                  return query;
                },
                is() {
                  return query;
                },
                select() {
                  return {
                    async maybeSingle() {
                      return { data: null, error: null };
                    },
                  };
                },
              };
              return query;
            },
          };
        },
      },
    },
    {
      userId: "user-1",
      profileExists: true,
      currentResumePdfKey: "user-1/resume-old.pdf",
      nextResumePdfKey: "user-1/resume-new.pdf",
      nextResumePdfUrl: "https://storage/resume-new.pdf",
    },
  );

  assert.deepEqual(result, { status: "stale" });
});

test("replaceResumeReferenceIfCurrent compares null keys with an IS filter", async () => {
  const filters: unknown[] = [];
  const result = await replaceResumeReferenceIfCurrent(
    {
      database: {
        from(table) {
          assert.equal(table, "profiles");
          return {
            insert() {
              throw new Error("insert should not be called");
            },
            update() {
              const query = {
                eq(column: string, value: unknown) {
                  filters.push(["eq", column, value]);
                  return query;
                },
                is(column: string, value: null) {
                  filters.push(["is", column, value]);
                  return query;
                },
                select() {
                  return {
                    async maybeSingle() {
                      return { data: { id: "user-1" }, error: null };
                    },
                  };
                },
              };
              return query;
            },
          };
        },
      },
    },
    {
      userId: "user-1",
      profileExists: true,
      currentResumePdfKey: null,
      nextResumePdfKey: "user-1/resume-new.pdf",
      nextResumePdfUrl: "https://storage/resume-new.pdf",
    },
  );

  assert.deepEqual(result, { status: "saved" });
  assert.deepEqual(filters, [
    ["eq", "id", "user-1"],
    ["is", "resume_pdf_key", null],
  ]);
});
