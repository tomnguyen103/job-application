import type { ReactElement } from "react";

type SkeletonBlockProps = {
  className: string;
};

export function SkeletonBlock({
  className,
}: SkeletonBlockProps): ReactElement {
  return (
    <div className={`animate-pulse rounded-md bg-surface-secondary ${className}`} />
  );
}
