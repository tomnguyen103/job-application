"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

const FILTER_DEBOUNCE_MS = 300;

const MATCH_FILTER_OPTIONS = [
  { value: "all", label: "All Matches" },
  { value: "high", label: "High Match" },
  { value: "low", label: "Low Match" },
] as const;

const SORT_OPTIONS = [
  { value: "match", label: "Match Score" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

const PARAM_DEFAULTS: Record<string, string> = {
  q: "",
  match: "all",
  sort: "match",
};

function SelectChevron(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
    >
      <path
        d="m3.5 5.25 3.5 3.5 3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JobFilters(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [filterText, setFilterText] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Render-phase adjustment (the React-documented alternative to a sync
  // effect): when the URL's q changes while the field is not focused,
  // back/forward or an in-app link, mirror it into the input. While the
  // user is editing, their in-flight text always wins.
  if (lastUrlQuery !== urlQuery) {
    setLastUrlQuery(urlQuery);
    if (!isEditing) {
      setFilterText(urlQuery);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Reads window.location.search instead of the searchParams snapshot so a
  // debounced apply never overwrites a select change made while it was pending.
  const applyParam = (key: "q" | "match" | "sort", value: string): void => {
    const params = new URLSearchParams(window.location.search);

    if (!value || value === PARAM_DEFAULTS[key]) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.delete("page");

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const handleFilterTextChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const value = event.target.value;
    setFilterText(value);

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      applyParam("q", value.trim());
    }, FILTER_DEBOUNCE_MS);
  };

  return (
    <div className="rounded-md border border-border bg-surface-elevated p-4 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
        >
          <circle
            cx="7.2"
            cy="7.2"
            r="4.6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="m13.5 13.5-2.8-2.8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          name="jobFilter"
          aria-label="Filter jobs by company or role"
          placeholder="Filter by company or role..."
          value={filterText}
          onChange={handleFilterTextChange}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-4 text-sm font-medium text-text-primary shadow-card placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            name="matchFilter"
            aria-label="Filter by match level"
            value={searchParams.get("match") ?? "all"}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              applyParam("match", event.target.value)
            }
            className="appearance-none rounded-md border border-border bg-surface py-2 pl-4 pr-9 text-sm font-medium text-text-primary shadow-card focus:border-accent focus:ring-accent focus:outline-none"
          >
            {MATCH_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>

        <div className="relative">
          <select
            name="sortBy"
            aria-label="Sort jobs"
            value={searchParams.get("sort") ?? "match"}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              applyParam("sort", event.target.value)
            }
            className="appearance-none rounded-md border border-border bg-surface py-2 pl-4 pr-9 text-sm font-medium text-text-primary shadow-card focus:border-accent focus:ring-accent focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      </div>
      </div>
    </div>
  );
}
