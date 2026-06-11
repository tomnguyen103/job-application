import type { ReactElement } from "react";

type Props = {
  fileName: string;
  meta: string;
  href?: string;
  onRemove: () => void;
  label?: string;
};

export function ResumePreview({
  fileName,
  meta,
  href,
  onRemove,
  label = "Remove",
}: Props): ReactElement {
  const fileIcon = (
    <svg
      className="text-accent"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );

  const fileDetails = (
    <div className="flex flex-col">
      <span className="text-sm font-medium leading-5 text-text-primary transition-colors hover:text-accent">
        {fileName}
      </span>
      <span className="text-xs font-normal leading-4 text-text-muted">
        {meta}
      </span>
    </div>
  );

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-secondary px-4 py-3">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title="View resume"
          className="flex items-center gap-3"
        >
          {fileIcon}
          {fileDetails}
        </a>
      ) : (
        <div className="flex items-center gap-3">
          {fileIcon}
          {fileDetails}
        </div>
      )}

      <div className="flex items-center gap-1">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-accent transition-opacity hover:opacity-80"
          >
            View
          </a>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-accent"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
