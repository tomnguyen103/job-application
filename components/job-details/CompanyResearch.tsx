"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { parseCompanyResearchDossier } from "@/lib/company-research";
import type { CompanyResearchDossier } from "@/types";

type Props = {
  jobId: string;
  company: string;
  initialResearch: CompanyResearchDossier | null;
};

type DossierIconName =
  | "overview"
  | "tech"
  | "culture"
  | "role"
  | "edge"
  | "gaps"
  | "questions"
  | "prep"
  | "sources";

type DossierIconTone = "accent" | "info" | "success" | "muted";

function ResearchIcon(): ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="10"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7 3v4M11 3v4M7 11h.01M9 11h.01M11 11h.01"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m10.4 10.4 3.1 3.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BuildingIcon(): ReactElement {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="4"
        width="12"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 8h1.5M13.5 8H15M9 11.5h1.5M13.5 11.5H15M10 20v-3a2 2 0 0 1 4 0v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpinnerIcon(): ReactElement {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function dossierIconToneClass(tone: DossierIconTone): string {
  if (tone === "info") {
    return "bg-info-lightest text-info-medium";
  }

  if (tone === "success") {
    return "bg-success-lightest text-success";
  }

  if (tone === "muted") {
    return "bg-surface text-text-secondary";
  }

  return "bg-accent-muted text-accent";
}

function DossierCardIcon({ name }: { name: DossierIconName }): ReactElement {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  if (name === "tech") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="m6.5 5-3 4 3 4M11.5 5l3 4-3 4M9.8 4.5 8.2 13.5" />
      </svg>
    );
  }

  if (name === "culture") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M6.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM11.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 15c.5-2.4 1.8-3.6 3.5-3.6S9.5 12.6 10 15M8 15c.5-2.4 1.8-3.6 3.5-3.6 1.2 0 2.2.6 2.9 1.8" />
      </svg>
    );
  }

  if (name === "role") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M6.5 6V4.8c0-.8.6-1.4 1.4-1.4h2.2c.8 0 1.4.6 1.4 1.4V6M3.8 6h10.4c.8 0 1.4.6 1.4 1.4v5.2c0 .8-.6 1.4-1.4 1.4H3.8c-.8 0-1.4-.6-1.4-1.4V7.4c0-.8.6-1.4 1.4-1.4ZM7 10h4" />
      </svg>
    );
  }

  if (name === "edge") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M9 2.5 14 4.7v3.7c0 3.2-2 5.7-5 7.1-3-1.4-5-3.9-5-7.1V4.7L9 2.5ZM6.7 9l1.5 1.5 3.1-3.2" />
      </svg>
    );
  }

  if (name === "gaps") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M3 5h2M8 5h7M3 9h7M13 9h2M3 13h4M10 13h5M5 4v2M10 8v2M7 12v2" />
      </svg>
    );
  }

  if (name === "questions") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M9 15.5A6.5 6.5 0 1 0 9 2.5a6.5 6.5 0 0 0 0 13ZM7.4 7.2a1.8 1.8 0 1 1 2.8 1.5c-.8.5-1.2.9-1.2 1.8M9 13h.01" />
      </svg>
    );
  }

  if (name === "prep") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M5 3v2M13 3v2M3.5 6.5h11M4.5 4.5h9c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5h-9C3.7 14.5 3 13.8 3 13V6c0-.8.7-1.5 1.5-1.5ZM6.2 10l1.6 1.6 3.8-3.4" />
      </svg>
    );
  }

  if (name === "sources") {
    return (
      <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
        <path {...common} d="M7.2 10.8 10.8 7.2M7.8 5.2l.7-.7a3 3 0 0 1 4.2 4.2l-.7.7M10.2 12.8l-.7.7a3 3 0 0 1-4.2-4.2l.7-.7" />
      </svg>
    );
  }

  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path {...common} d="M9 2.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM9 6v3.5l2.3 1.4" />
    </svg>
  );
}

function valueFor(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return Reflect.get(value, key);
}

function errorFromPayload(payload: unknown): string {
  const error = valueFor(payload, "error");
  return typeof error === "string" && error.trim()
    ? error.trim()
    : "Could not research this company. Please try again.";
}

function dossierFromPayload(payload: unknown): CompanyResearchDossier | null {
  const data = valueFor(payload, "data");
  const dossier = valueFor(data, "dossier");
  return parseCompanyResearchDossier(dossier);
}

function formatSource(source: string): string {
  try {
    const url = new URL(source);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`;
  } catch {
    return source;
  }
}

function ResearchCard({
  title,
  icon,
  tone = "accent",
  wide = false,
  children,
}: {
  title: string;
  icon: DossierIconName;
  tone?: DossierIconTone;
  wide?: boolean;
  children: ReactNode;
}): ReactElement {
  const className = wide
    ? "rounded-xl border border-border bg-surface-secondary p-5 lg:col-span-2"
    : "rounded-xl border border-border bg-surface-secondary p-5";

  return (
    <article className={className}>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${dossierIconToneClass(tone)}`}
        >
          <DossierCardIcon name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold uppercase leading-5 tracking-wide text-text-secondary">
            {title}
          </h3>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </article>
  );
}

function TextCard({
  title,
  icon,
  tone,
  wide = false,
  children,
}: {
  title: string;
  icon: DossierIconName;
  tone?: DossierIconTone;
  wide?: boolean;
  children: string;
}): ReactElement {
  return (
    <ResearchCard title={title} icon={icon} tone={tone} wide={wide}>
      <p className="text-[15px] font-medium leading-7 text-text-primary">
        {children || "Not enough signal available yet."}
      </p>
    </ResearchCard>
  );
}

function ListCard({
  title,
  icon,
  tone,
  items,
  emptyMessage = "Not enough signal available yet.",
}: {
  title: string;
  icon: DossierIconName;
  tone?: DossierIconTone;
  items: string[];
  emptyMessage?: string;
}): ReactElement {
  const displayItems = items.length > 0 ? items : [emptyMessage];

  return (
    <ResearchCard title={title} icon={icon} tone={tone}>
      <ul className="space-y-2">
        {displayItems.map((item) => (
          <li
            key={`${title}-${item}`}
            className="flex gap-3 text-sm font-medium leading-6 text-text-primary"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </ResearchCard>
  );
}

function TagCard({
  title,
  icon,
  tone,
  items,
  wide = false,
  emptyMessage = "Not enough signal available yet.",
}: {
  title: string;
  icon: DossierIconName;
  tone?: DossierIconTone;
  items: string[];
  wide?: boolean;
  emptyMessage?: string;
}): ReactElement {
  return (
    <ResearchCard title={title} icon={icon} tone={tone} wide={wide}>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="inline-flex rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold leading-4 text-accent"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-medium leading-6 text-text-primary">
          {emptyMessage}
        </p>
      )}
    </ResearchCard>
  );
}

function SourcesCard({ sources }: { sources: string[] }): ReactElement {
  return (
    <ResearchCard title="Sources" icon="sources" tone="muted" wide>
      {sources.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {sources.map((source) => (
            <li key={source}>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-sm font-semibold leading-6 text-accent transition-opacity hover:opacity-80"
              >
                {formatSource(source)}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-medium leading-6 text-text-primary">
          Saved job posting and profile only.
        </p>
      )}
    </ResearchCard>
  );
}

function ResearchDossier({
  research,
}: {
  research: CompanyResearchDossier;
}): ReactElement {
  return (
    <div className="px-8 py-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <TextCard title="Company Overview" icon="overview" tone="accent" wide>
          {research.companyOverview}
        </TextCard>
        <TagCard
          title="Tech Stack"
          icon="tech"
          tone="accent"
          items={research.techStack}
          wide
          emptyMessage="No company or job-posting technology evidence found."
        />
        <ListCard
          title="Culture"
          icon="culture"
          tone="info"
          items={research.culture}
        />
        <ListCard
          title="Your Edge"
          icon="edge"
          tone="success"
          items={research.yourEdge}
        />
        <ListCard
          title="Gaps to Address"
          icon="gaps"
          tone="accent"
          items={research.gapsToAddress}
        />
        <TextCard title="Why This Role" icon="role" tone="muted">
          {research.whyThisRole}
        </TextCard>
        <ListCard
          title="Smart Questions"
          icon="questions"
          tone="info"
          items={research.smartQuestions}
        />
        <ListCard
          title="Interview Prep"
          icon="prep"
          tone="success"
          items={research.interviewPrep}
        />
        <SourcesCard sources={research.sources} />
      </div>
    </div>
  );
}

function EmptyResearch({
  company,
  isLoading,
}: {
  company: string;
  isLoading: boolean;
}): ReactElement {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-6 py-14">
      <div className="max-w-[360px] text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-secondary text-text-muted">
          {isLoading ? <SpinnerIcon /> : <BuildingIcon />}
        </span>
        <p className="mt-5 text-base font-semibold leading-6 text-text-primary">
          {isLoading ? "Researching company" : "No research yet"}
        </p>
        <p className="mt-2 text-base font-medium leading-6 text-text-muted">
          {isLoading
            ? `Browsing ${company}'s public pages and preparing the dossier.`
            : `Click "Research Company" to let the AI browse ${company}'s public pages and build a dossier.`}
        </p>
      </div>
    </div>
  );
}

export function CompanyResearch({
  jobId,
  company,
  initialResearch,
}: Props): ReactElement {
  const router = useRouter();
  const [research, setResearch] =
    useState<CompanyResearchDossier | null>(initialResearch);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResearch(): Promise<void> {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(errorFromPayload(payload));
        return;
      }

      const dossier = dossierFromPayload(payload);
      if (!dossier) {
        setError("Company research returned no usable dossier.");
        return;
      }

      setResearch(dossier);
      router.refresh();
    } catch (requestError) {
      console.error("[CompanyResearch]", requestError);
      setError("Could not research this company. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-4 border-b border-border px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-accent">
            <ResearchIcon />
          </span>
          <h2 className="text-xl font-bold leading-7 text-text-primary">
            Company Research
          </h2>
        </div>

        <button
          type="button"
          onClick={handleResearch}
          disabled={isLoading}
          aria-busy={isLoading}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-base font-semibold text-accent-foreground shadow-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <SpinnerIcon /> : <SearchIcon />}
          {isLoading
            ? "Researching..."
            : research
              ? "Refresh Research"
              : "Research Company"}
        </button>
      </div>

      {research ? (
        <ResearchDossier research={research} />
      ) : (
        <EmptyResearch company={company} isLoading={isLoading} />
      )}

      {error ? (
        <p
          className="border-t border-border px-8 py-4 text-sm font-medium leading-5 text-error"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
