import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, sep } from "node:path";

const TEST_GLOB = "tests/**/*.test.ts";

function collectTestFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectTestFiles(path);
    }

    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const requestedPattern = process.argv[2] ?? TEST_GLOB;

if (requestedPattern !== TEST_GLOB) {
  console.error(`Unsupported test pattern: ${requestedPattern}`);
  process.exit(1);
}

const testFiles = collectTestFiles("tests").sort((a, b) => a.localeCompare(b));

if (testFiles.length === 0) {
  console.error(`No test files matched ${TEST_GLOB}`);
  process.exit(1);
}

const normalizedFiles = testFiles.map((file) => file.split(sep).join("/"));
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...normalizedFiles],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
