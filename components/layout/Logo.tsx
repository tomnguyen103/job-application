import Image from "next/image";
import type { ReactElement } from "react";

type LogoProps = {
  className?: string;
  preload?: boolean;
};

export function Logo({
  className = "h-10 w-auto",
  preload = false,
}: LogoProps): ReactElement {
  return (
    <Image
      src="/logo2.png"
      alt="Job Application"
      width={894}
      height={168}
      preload={preload}
      className={`theme-logo ${className}`}
    />
  );
}
