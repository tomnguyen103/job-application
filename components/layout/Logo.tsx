import Image from "next/image";
import type { ReactElement } from "react";

export function Logo(): ReactElement {
  return (
    <Image
      src="/logo2.png"
      alt="Job Application"
      width={894}
      height={168}
      className="h-10 w-auto"
    />
  );
}
