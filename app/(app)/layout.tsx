import type { ReactElement, ReactNode } from "react";

import { Navbar } from "@/components/layout/Navbar";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto w-full max-w-[1280px] px-6 py-8 lg:px-0">
        {children}
      </section>
    </main>
  );
}
