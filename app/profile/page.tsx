import type { ReactElement } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { requireCurrentUser } from "@/lib/insforge-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage(): Promise<ReactElement> {
  await requireCurrentUser();

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-[1280px] border-x border-b border-border bg-surface px-8 py-10">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <p className="text-xs font-bold uppercase leading-4 text-accent">
            Profile
          </p>
          <h1 className="mt-3 text-[30px] font-semibold leading-9 text-text-primary">
            Profile workspace
          </h1>
          <p className="mt-3 max-w-[560px] text-sm font-medium leading-5 text-text-secondary">
            Your profile area is ready for this account.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
