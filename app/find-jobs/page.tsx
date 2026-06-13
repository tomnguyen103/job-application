import type { ReactElement } from "react";

import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import type { JobListItem } from "@/components/find-jobs/JobsTable";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { Navbar } from "@/components/layout/Navbar";
import {
  createInsforgeServer,
  requireCurrentUser,
} from "@/lib/insforge-server";
import { MATCH_THRESHOLD, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type MatchFilter = "all" | "high" | "low";

type SortOption = "match" | "newest" | "oldest";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type JobRow = {
  id: string;
  company: string | null;
  title: string | null;
  match_score: number | null;
  salary: string | null;
  found_at: string | null;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parseMatchFilter(value: string): MatchFilter {
  return value === "high" || value === "low" ? value : "all";
}

function parseSortOption(value: string): SortOption {
  return value === "newest" || value === "oldest" ? value : "match";
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

// The term is embedded in a PostgREST or() filter expression, so filter
// syntax characters and LIKE wildcards are stripped rather than escaped.
function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()"%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHrefForPage(args: {
  q: string;
  match: MatchFilter;
  sort: SortOption;
}): (page: number) => string {
  return (page: number): string => {
    const params = new URLSearchParams();

    if (args.q) {
      params.set("q", args.q);
    }
    if (args.match !== "all") {
      params.set("match", args.match);
    }
    if (args.sort !== "match") {
      params.set("sort", args.sort);
    }
    if (page > 1) {
      params.set("page", String(page));
    }

    const queryString = params.toString();
    return queryString ? `/find-jobs?${queryString}` : "/find-jobs";
  };
}

function mapJobRowToListItem(row: JobRow): JobListItem {
  return {
    id: row.id,
    company: row.company ?? "Unknown company",
    role: row.title ?? "Untitled role",
    matchScore: row.match_score ?? 0,
    salary: row.salary ?? "-",
    dateFound: row.found_at ? formatRelativeTime(row.found_at) : "-",
  };
}

export default async function FindJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<ReactElement> {
  const user = await requireCurrentUser();
  const params = await searchParams;

  const rawQuery = firstValue(params.q).trim();
  const matchFilter = parseMatchFilter(firstValue(params.match));
  const sortOption = parseSortOption(firstValue(params.sort));
  const currentPage = parsePage(firstValue(params.page));
  const term = sanitizeSearchTerm(rawQuery);

  // A filter that sanitizes to nothing (e.g. "%%%") cannot match anything,
  // clamp to zero results instead of silently filtering nothing.
  const isUnsearchableQuery = rawQuery !== "" && term === "";

  const from = (currentPage - 1) * PAGE_SIZE;

  let rows: JobRow[] = [];
  let totalResults = 0;
  let loadFailed = false;

  if (!isUnsearchableQuery) {
    const insforge = await createInsforgeServer();

    let query = insforge.database
      .from("jobs")
      .select("id, company, title, match_score, salary, found_at", {
        count: "exact",
      })
      .eq("user_id", user.id);

    if (matchFilter === "high") {
      query = query.gte("match_score", MATCH_THRESHOLD);
    } else if (matchFilter === "low") {
      query = query.lt("match_score", MATCH_THRESHOLD);
    }

    if (term) {
      query = query.or(`company.ilike.%${term}%,title.ilike.%${term}%`);
    }

    if (sortOption === "newest") {
      query = query.order("found_at", { ascending: false });
    } else if (sortOption === "oldest") {
      query = query.order("found_at", { ascending: true });
    } else {
      query = query.order("match_score", { ascending: false });
    }

    const { data, count, error } = await query.range(
      from,
      from + PAGE_SIZE - 1,
    );

    if (error) {
      console.error("[find-jobs] jobs read error:", error);
      loadFailed = true;
    } else {
      // Boundary assertion on the SDK row shape, columns selected above.
      rows = (data ?? []) as JobRow[];
      totalResults = count ?? 0;
    }
  }

  const jobs = rows.map(mapJobRowToListItem);
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const hasActiveFilters =
    Boolean(term) || matchFilter !== "all" || isUnsearchableQuery;
  const emptyMessage = loadFailed
    ? "Could not load your jobs. Refresh the page to try again."
    : hasActiveFilters || totalResults > 0
      ? "No jobs match your filters."
      : "No jobs yet. Search above to find your first matches.";

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-0">
        <div className="flex flex-col gap-6">
          <div className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
            <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
              Find Jobs
            </p>
            <h1 className="mt-3 text-[30px] font-bold leading-9 text-text-black">
              Search, score, and shortlist roles
            </h1>
            <p className="mt-3 max-w-[720px] text-sm font-medium leading-6 text-text-secondary">
              Start a new Adzuna discovery run, then filter saved roles by
              company, title, match score, and recency.
            </p>
          </div>
          <SearchControls userId={user.id} />
          <JobFilters />
          <JobsTable
            jobs={jobs}
            showingFrom={jobs.length === 0 ? 0 : from + 1}
            showingTo={from + jobs.length}
            totalResults={totalResults}
            currentPage={currentPage}
            totalPages={totalPages}
            emptyMessage={emptyMessage}
            hrefForPage={buildHrefForPage({
              q: rawQuery,
              match: matchFilter,
              sort: sortOption,
            })}
          />
        </div>
      </section>
    </main>
  );
}
