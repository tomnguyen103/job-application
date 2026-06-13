import Link from "next/link";
import type { ReactElement } from "react";

import { JobsPagination } from "@/components/find-jobs/JobsPagination";

export type JobListItem = {
  id: string;
  company: string;
  role: string;
  matchScore: number;
  salary: string;
  dateFound: string;
};

type Props = {
  jobs: JobListItem[];
  showingFrom: number;
  showingTo: number;
  totalResults: number;
  currentPage: number;
  totalPages: number;
  emptyMessage: string;
  hrefForPage: (page: number) => string;
};

const HEADERS = [
  "Company",
  "Role",
  "Match Score",
  "Salary Est.",
  "Date Found",
];

// Color ranges derived from the find-jobs design: green >= 90, blue 80-89, orange below.
function matchScoreBarClass(score: number): string {
  if (score >= 90) {
    return "bg-success";
  }

  if (score >= 80) {
    return "bg-info";
  }

  return "bg-warning";
}

function CompanyIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="2.5"
        width="10"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.8 5.4h1.4M8.8 5.4h1.4M5.8 8h1.4M8.8 8h1.4M6.6 13.5v-2.4a1.4 1.4 0 0 1 2.8 0v2.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MatchMeter({ score }: { score: number }): ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border-light">
        <span
          className={`block h-full rounded-full ${matchScoreBarClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </span>
      <span className="text-sm font-semibold text-text-primary">{score}%</span>
    </div>
  );
}

function MobileJobCard({ job }: { job: JobListItem }): ReactElement {
  return (
    <article className="rounded-md border border-border bg-surface p-4">
      <Link href={`/find-jobs/${job.id}`} className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-tertiary text-text-secondary">
          <CompanyIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5 text-text-primary">
            {job.company}
          </span>
          <span className="mt-1 block text-sm font-medium leading-5 text-text-secondary">
            {job.role}
          </span>
        </span>
      </Link>
      <div className="mt-4">
        <MatchMeter score={job.matchScore} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium leading-4 text-text-secondary">
        <div className="rounded-md bg-surface-secondary px-3 py-2">
          <span className="block font-semibold text-text-primary">Salary</span>
          {job.salary}
        </div>
        <div className="rounded-md bg-surface-secondary px-3 py-2">
          <span className="block font-semibold text-text-primary">Found</span>
          {job.dateFound}
        </div>
      </div>
    </article>
  );
}

export function JobsTable({
  jobs,
  showingFrom,
  showingTo,
  totalResults,
  currentPage,
  totalPages,
  emptyMessage,
  hrefForPage,
}: Props): ReactElement {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface-elevated shadow-card">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="bg-surface-secondary">
              {HEADERS.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-secondary"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr className="border-t border-border">
                <td
                  colSpan={HEADERS.length}
                  className="px-6 py-12 text-center text-sm font-medium text-text-secondary"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-t border-border transition-colors hover:bg-surface-secondary"
              >
                <td className="px-6 py-3.5">
                  <Link
                    href={`/find-jobs/${job.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-tertiary text-text-secondary">
                      <CompanyIcon />
                    </span>
                    <span className="text-sm font-semibold text-text-primary transition-colors hover:text-accent">
                      {job.company}
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-3.5">
                  <Link
                    href={`/find-jobs/${job.id}`}
                    className="text-sm font-medium text-text-primary transition-colors hover:text-accent"
                  >
                    {job.role}
                  </Link>
                </td>
                <td className="px-6 py-3.5">
                  <MatchMeter score={job.matchScore} />
                </td>
                <td className="px-6 py-3.5 text-sm font-medium text-text-secondary">
                  {job.salary}
                </td>
                <td className="px-6 py-3.5 text-sm font-medium text-text-secondary">
                  {job.dateFound}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 md:hidden">
        {jobs.length === 0 ? (
          <p className="rounded-md border border-border bg-surface px-6 py-10 text-center text-sm font-medium text-text-secondary">
            {emptyMessage}
          </p>
        ) : (
          jobs.map((job) => <MobileJobCard key={job.id} job={job} />)
        )}
      </div>

      {jobs.length > 0 ? (
        <p className="border-t border-border px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Jobs by Adzuna
        </p>
      ) : null}

      {totalResults > 0 ? (
        <JobsPagination
          showingFrom={showingFrom}
          showingTo={showingTo}
          totalResults={totalResults}
          currentPage={currentPage}
          totalPages={totalPages}
          hrefForPage={hrefForPage}
        />
      ) : null}
    </div>
  );
}
