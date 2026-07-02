import type { ReactElement } from "react";

type Props = {
  title: string;
  company: string;
  matchScore: number;
  postUrl: string | null;
  sourceDisplayName: string;
  salary: string;
  location: string;
  jobType: string;
  dateFound: string;
};

type InfoCardProps = {
  label: string;
  value: string;
  tone: "salary" | "location" | "jobType" | "date";
};

function CompanyIcon(): ReactElement {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20v-3a2 2 0 1 1 4 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalLinkIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6.5 3.5H4.25A1.75 1.75 0 0 0 2.5 5.25v6.5c0 .97.78 1.75 1.75 1.75h6.5c.97 0 1.75-.78 1.75-1.75V9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 2.5h4.5V7M13.25 2.75 7.5 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DollarIcon(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3v18M16.5 7.5H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinIcon(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M19 10c0 5.25-7 10-7 10s-7-4.75-7-10a7 7 0 1 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BriefcaseIcon(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4c1 0 1.8.8 1.8 1.8V7M5.8 8h12.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8V9.8C4 8.8 4.8 8 5.8 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 12h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3.5v4M16 3.5v4M4 10h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function iconByTone(tone: InfoCardProps["tone"]): ReactElement {
  if (tone === "salary") {
    return <DollarIcon />;
  }

  if (tone === "location") {
    return <PinIcon />;
  }

  if (tone === "jobType") {
    return <BriefcaseIcon />;
  }

  return <CalendarIcon />;
}

function iconClassByTone(tone: InfoCardProps["tone"]): string {
  if (tone === "salary") {
    return "bg-success-lightest text-success";
  }

  if (tone === "location") {
    return "bg-info-lightest text-info-medium";
  }

  if (tone === "jobType") {
    return "bg-accent-muted text-accent";
  }

  return "bg-surface-secondary text-text-secondary";
}

function matchScoreBadgeClass(score: number): string {
  if (score >= 90) {
    return "bg-success-lightest text-success-foreground";
  }

  if (score >= 80) {
    return "bg-info-lightest text-info-foreground";
  }

  return "bg-warning text-warning-foreground";
}

function InfoCard({ label, value, tone }: InfoCardProps): ReactElement {
  return (
    <article className="flex min-w-0 items-center gap-4 rounded-md border border-border bg-surface-elevated p-5 shadow-card">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${iconClassByTone(tone)}`}
      >
        {iconByTone(tone)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-base font-semibold leading-6 text-text-primary">
          {value}
        </p>
        <p className="mt-1 text-xs font-bold uppercase leading-4 tracking-wide text-text-muted">
          {label}
        </p>
      </div>
    </article>
  );
}

export function JobInfo({
  title,
  company,
  matchScore,
  postUrl,
  sourceDisplayName,
  salary,
  location,
  jobType,
  dateFound,
}: Props): ReactElement {
  return (
    <>
      <section className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="landing-hero-gradient p-6 sm:p-8">
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Decision workspace
          </p>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="mt-5 flex min-w-0 items-center gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-surface-glass text-text-muted">
              <CompanyIcon />
            </span>
            <div className="min-w-0">
              <h1 className="break-words text-[30px] font-bold leading-9 text-text-black sm:text-[36px] sm:leading-[1.12]">
                {title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-base font-semibold leading-6 text-text-secondary">
                <span>{company}</span>
                <span
                  className="h-1 w-1 rounded-full bg-text-muted"
                  aria-hidden="true"
                />
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold leading-5 ${matchScoreBadgeClass(matchScore)}`}
                >
                  {matchScore}% match
                </span>
                <span className="rounded-full border border-border bg-surface px-3 py-1 text-sm font-semibold leading-5 text-text-secondary">
                  {sourceDisplayName}
                </span>
              </div>
            </div>
          </div>

          {postUrl ? (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-text-primary shadow-card transition-colors hover:border-accent hover:bg-surface-secondary"
            >
              <ExternalLinkIcon />
              View original post
            </a>
          ) : (
            <span className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-semibold text-text-muted shadow-card">
              <ExternalLinkIcon />
              Original post unavailable
            </span>
          )}
          </div>
        </div>
      </section>

      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Job facts"
      >
        <InfoCard label="Salary Est." value={salary} tone="salary" />
        <InfoCard label="Location" value={location} tone="location" />
        <InfoCard label="Job Type" value={jobType} tone="jobType" />
        <InfoCard label="Date Found" value={dateFound} tone="date" />
      </section>
    </>
  );
}
