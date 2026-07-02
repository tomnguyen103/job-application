import type { ReactElement } from "react";

import { ApplicationConfidence } from "@/components/homepage/ApplicationConfidence";
import { FinalCta } from "@/components/homepage/FinalCta";
import { Hero } from "@/components/homepage/Hero";
import { JobSearchEase } from "@/components/homepage/JobSearchEase";
import { OutcomeStrip } from "@/components/homepage/OutcomeStrip";
import { TrustSection } from "@/components/homepage/TrustSection";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export default function Home(): ReactElement {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-text-primary">
      <Navbar authMode="static" />
      <Hero />
      <OutcomeStrip />
      <JobSearchEase />
      <ApplicationConfidence />
      <TrustSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
