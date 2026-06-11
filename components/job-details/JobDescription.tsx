import type { ReactElement } from "react";

type Props = {
  description: string;
  postUrl: string | null;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  aboutCompany: string;
};

type BulletSectionProps = {
  title: string;
  items: string[];
};

function DocumentIcon(): ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5.25 2.25h5.1L13.5 5.4v8.85c0 .83-.67 1.5-1.5 1.5H5.25c-.83 0-1.5-.67-1.5-1.5V3.75c0-.83.67-1.5 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.25 2.25v3.2h3.25M6.5 9h5M6.5 12h3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon(): ReactElement {
  return (
    <svg
      width="15"
      height="15"
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

function isTruncatedPreview(description: string): boolean {
  return /(?:\u2026|\.{3})$/.test(description.trim());
}

function BulletSection({ title, items }: BulletSectionProps): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
        {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function JobDescription({
  description,
  postUrl,
  responsibilities,
  requirements,
  niceToHave,
  benefits,
  aboutCompany,
}: Props): ReactElement {
  const hasDescription = description.trim().length > 0;
  const isPreview = hasDescription && isTruncatedPreview(description);

  return (
    <section className="rounded-2xl border border-border bg-surface p-8 shadow-card">
      <div className="flex items-center gap-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-secondary text-text-secondary">
          <DocumentIcon />
        </span>
        <h2 className="text-xl font-bold leading-7 text-text-primary">
          Job Description
        </h2>
      </div>

      <div className="mt-6 space-y-6 text-[15px] font-semibold leading-7 text-text-primary">
        {hasDescription ? (
          <p>{description}</p>
        ) : (
          <p className="font-medium text-text-secondary">
            No job description has been saved for this role yet.
          </p>
        )}

        {isPreview ? (
          <aside className="rounded-xl border border-border bg-surface-secondary p-4 text-sm font-medium leading-6 text-text-secondary">
            <p>
              This saved description is the preview returned by the job source,
              so it may end before the full posting does.
            </p>
            {postUrl ? (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold leading-5 text-accent transition-opacity hover:opacity-80"
              >
                View the full job post
                <ExternalLinkIcon />
              </a>
            ) : (
              <p className="mt-3 text-sm font-semibold text-text-primary">
                The original job post link is unavailable for this saved role.
              </p>
            )}
          </aside>
        ) : null}

        <BulletSection title="Responsibilities" items={responsibilities} />
        <BulletSection title="Requirements" items={requirements} />
        <BulletSection title="Nice to Have" items={niceToHave} />
        <BulletSection title="Benefits" items={benefits} />

        {aboutCompany ? (
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary">
              About the Company
            </h3>
            <p className="mt-3">{aboutCompany}</p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
