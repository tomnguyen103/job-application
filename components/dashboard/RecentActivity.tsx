import type { ReactElement } from "react";

export type ActivityTone = "accent" | "info" | "success";

export type ActivityEntry = {
  id: string;
  title: string;
  timestamp: string;
  tone: ActivityTone;
};

type Props = {
  entries: ActivityEntry[];
  emptyMessage?: string;
};

const DOT_TONE_CLASSES: Record<ActivityTone, { ring: string; dot: string }> = {
  accent: { ring: "bg-accent-light", dot: "bg-accent" },
  info: { ring: "bg-info-light", dot: "bg-info" },
  success: { ring: "bg-success-light", dot: "bg-success-alt" },
};

export function RecentActivity({
  entries,
  emptyMessage = "No activity yet. Run your first job search to see it here.",
}: Props): ReactElement {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface-elevated shadow-card">
      <header className="border-b border-border px-6 py-5">
        <h2 className="text-base font-semibold leading-6 text-text-primary">
          Recent Activity
        </h2>
        <p className="mt-1 text-xs font-medium leading-4 text-text-secondary">
          Searches and company research from your account.
        </p>
      </header>
      {entries.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm font-medium leading-5 text-text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ul className="px-6 py-5">
          {entries.map((entry, index) => {
            const tone = DOT_TONE_CLASSES[entry.tone];
            const isLast = index === entries.length - 1;

            return (
              <li key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-surface ${tone.ring}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                  </span>
                  {isLast ? null : (
                    <span
                      aria-hidden="true"
                      className="mt-1 w-px flex-1 bg-border"
                    />
                  )}
                </div>
                <div className={isLast ? "" : "pb-5"}>
                  <p className="text-sm font-medium leading-5 text-text-primary">
                    {entry.title}
                  </p>
                  <p className="mt-1 text-xs font-normal leading-4 text-text-muted">
                    {entry.timestamp}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
