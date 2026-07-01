import type {
  JobSearchInput,
  NormalizedJobPosting,
  SourceMetadataValue,
} from "@/agent/types";

const MAX_METADATA_STRING_LENGTH = 240;

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function stripHtml(value: unknown): string {
  return cleanText(
    typeof value === "string"
      ? value
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
      : "",
  );
}

export function canonicalPostingUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return rawUrl;
  }
}

export function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function titleCaseSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function compactMetadata(
  values: Record<string, unknown>,
): Record<string, SourceMetadataValue> {
  const metadata: Record<string, SourceMetadataValue> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === null || typeof value === "boolean") {
      metadata[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      metadata[key] = value;
    } else if (typeof value === "string") {
      const text = cleanText(value);
      if (text) {
        metadata[key] =
          text.length > MAX_METADATA_STRING_LENGTH
            ? text.slice(0, MAX_METADATA_STRING_LENGTH)
            : text;
      }
    }
  }

  return metadata;
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  }

  return (await response.json()) as T;
}

/**
 * Fetches and normalizes postings across multiple ATS boards for one provider,
 * concurrently rather than one board at a time — a serial loop here would
 * multiply this provider's latency by the number of configured boards. Each
 * board is isolated with Promise.allSettled: one bad board slug (typo, 404,
 * transient error) contributes zero results instead of discarding every other
 * board's already-fetched postings too.
 */
export async function searchAtsBoards(args: {
  boardSlugs: string[];
  input: JobSearchInput;
  fetchBoard: (
    boardSlug: string,
    input: JobSearchInput,
  ) => Promise<NormalizedJobPosting[]>;
}): Promise<NormalizedJobPosting[]> {
  const { boardSlugs, input, fetchBoard } = args;

  const outcomes = await Promise.allSettled(
    boardSlugs.map((boardSlug) => fetchBoard(boardSlug, input)),
  );

  const perBoardResults = outcomes.map((outcome, index) => {
    if (outcome.status === "fulfilled") {
      return outcome.value;
    }
    console.error(
      `[job-sources] board "${boardSlugs[index]}" fetch failed:`,
      outcome.reason,
    );
    return [];
  });

  return perBoardResults.flat().slice(0, input.limit);
}

export function containsSearchTerms(args: {
  haystack: string;
  query: string;
}): boolean {
  const queryWords = args.query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);

  if (queryWords.length === 0) {
    return true;
  }

  const haystack = args.haystack.toLowerCase();
  return queryWords.every((word) => haystack.includes(word));
}
