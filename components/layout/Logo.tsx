import Image from "next/image";
import type { ReactElement } from "react";

type LogoProps = {
  className?: string;
  priority?: boolean;
};

export function Logo({
  className = "h-10 w-auto",
  priority = false,
}: LogoProps): ReactElement {
  return (
    <Image
      src="/logo2.png"
      alt="Job Application"
      width={894}
      height={168}
      priority={priority}
      className={`theme-logo ${className}`}
    />
  );
}
