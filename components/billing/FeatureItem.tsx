import type { ReactElement, ReactNode } from "react";

type FeatureItemProps = {
  children: ReactNode;
};

export function FeatureItem({ children }: FeatureItemProps): ReactElement {
  return (
    <li className="flex items-start gap-2 text-sm font-medium leading-6 text-text-secondary">
      <svg
        className="mt-1 h-4 w-4 flex-shrink-0 text-success"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
