import Link from "next/link";
import type { ReactElement } from "react";

type Props = {
  showingFrom: number;
  showingTo: number;
  totalResults: number;
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
};

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = Array.from(
    new Set(
      [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
        (page) => page >= 1 && page <= totalPages,
      ),
    ),
  ).sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;

  for (const page of pages) {
    if (previous > 0 && page - previous > 1) {
      items.push(page > currentPage ? "ellipsis-end" : "ellipsis-start");
    }

    items.push(page);
    previous = page;
  }

  return items;
}

export function JobsPagination({
  showingFrom,
  showingTo,
  totalResults,
  currentPage,
  totalPages,
  hrefForPage,
}: Props): ReactElement {
  const pageItems = buildPageItems(currentPage, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const edgeButtonBase =
    "inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors";
  const pageButtonBase =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors";

  return (
    <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-text-secondary">
        Showing{" "}
        <span className="font-semibold text-text-primary">{showingFrom}</span>{" "}
        to <span className="font-semibold text-text-primary">{showingTo}</span>{" "}
        of{" "}
        <span className="font-semibold text-text-primary">{totalResults}</span>{" "}
        results
      </p>

      <nav aria-label="Jobs pagination" className="flex items-center gap-2">
        {isFirstPage ? (
          <span
            aria-disabled="true"
            className={`${edgeButtonBase} cursor-not-allowed text-text-muted`}
          >
            Previous
          </span>
        ) : (
          <Link
            href={hrefForPage(currentPage - 1)}
            className={`${edgeButtonBase} text-text-dark hover:bg-surface-secondary`}
          >
            Previous
          </Link>
        )}

        {pageItems.map((item) =>
          typeof item !== "number" ? (
            <span
              key={item}
              className="inline-flex h-9 w-6 items-center justify-center text-sm font-medium text-text-muted"
            >
              ...
            </span>
          ) : item === currentPage ? (
            <span
              key={item}
              aria-current="page"
              className={`${pageButtonBase} border-accent-light bg-accent-light text-accent`}
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={hrefForPage(item)}
              className={`${pageButtonBase} border-border bg-surface text-text-dark hover:bg-surface-secondary`}
            >
              {item}
            </Link>
          ),
        )}

        {isLastPage ? (
          <span
            aria-disabled="true"
            className={`${edgeButtonBase} cursor-not-allowed text-text-muted`}
          >
            Next
          </span>
        ) : (
          <Link
            href={hrefForPage(currentPage + 1)}
            className={`${edgeButtonBase} text-text-dark hover:bg-surface-secondary`}
          >
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
