import type { ReactElement } from "react";

import type { InterviewPrepHighlights } from "@/lib/engagement-insights";

type Props = {
  prep: InterviewPrepHighlights;
};

type PrepSectionProps = {
  title: string;
  detail: string;
  items: string[];
  tone: "accent" | "info" | "success" | "muted";
};

function toneClass(tone: PrepSectionProps["tone"]): string {
  if (tone === "info") {
    return "bg-info-lightest text-info-foreground";
  }

  if (tone === "success") {
    return "bg-success-lightest text-success-foreground";
  }

  if (tone === "muted") {
    return "bg-surface-secondary text-text-secondary";
  }

  return "bg-accent-muted text-accent";
}

function PrepSection({
  title,
  detail,
  items,
  tone,
}: PrepSectionProps): ReactElement {
  return (
    <article className="rounded-md border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${toneClass(tone)}`}
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-semibold leading-5 text-text-primary">
            {title}
          </h3>
          <p className="mt-1 text-xs font-medium leading-5 text-text-secondary">
            {detail}
          </p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={`${title}-${item}`}
            className="flex gap-3 text-sm font-medium leading-6 text-text-primary"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function InterviewPrepExpansion({ prep }: Props): ReactElement {
  return (
    <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase leading-4 tracking-[0.2em] text-accent">
            Interview prep
          </p>
          <h2 className="mt-3 text-xl font-bold leading-7 text-text-primary">
            Turn the research into talking points
          </h2>
          <p className="mt-2 max-w-[660px] text-sm font-medium leading-6 text-text-secondary">
            {prep.hasResearch
              ? "Use the saved dossier to rehearse the strongest questions, gaps, and proof points before applying."
              : "Run company research above to unlock company-specific prep. This fallback uses the saved match data."}
          </p>
        </div>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text-primary shadow-card">
          {prep.hasResearch ? "Research-backed" : "Match-based"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PrepSection
          title="Focus areas"
          detail="What to review before the first conversation."
          items={prep.focus}
          tone="accent"
        />
        <PrepSection
          title="Lead with"
          detail="Profile-backed examples to bring forward."
          items={prep.leadWith}
          tone="success"
        />
        <PrepSection
          title="Gap framing"
          detail="Honest bridges for skills the role may ask about."
          items={prep.gapStrategy}
          tone="muted"
        />
        <PrepSection
          title="Questions to ask"
          detail="Prompts that show you prepared for this company."
          items={prep.questions}
          tone="info"
        />
      </div>
    </section>
  );
}
