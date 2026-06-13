import Image from "next/image";
import type { ReactElement } from "react";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "h-10 w-auto" }: LogoProps): ReactElement {
  return (
    <Image
      src="/logo2.png"
      alt="Job Application"
      width={894}
      height={168}
      className={className}
    />
  );
}
