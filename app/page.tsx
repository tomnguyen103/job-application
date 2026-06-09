import type { ReactElement } from "react";

import { ApplicationConfidence } from "@/components/homepage/ApplicationConfidence";
import { FinalCta } from "@/components/homepage/FinalCta";
import { Hero } from "@/components/homepage/Hero";
import { JobSearchEase } from "@/components/homepage/JobSearchEase";
import { Testimonial } from "@/components/homepage/Testimonial";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const dynamic = "force-dynamic";

export default function Home(): ReactElement {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <JobSearchEase />
      <ApplicationConfidence />
      <div className="landing-diagonal-band mx-auto h-20 max-w-[1280px] border-x border-b border-border" />
      <Testimonial />
      <div className="landing-diagonal-band mx-auto h-20 max-w-[1280px] border-x border-b border-border" />
      <FinalCta />
      <div className="landing-diagonal-band mx-auto h-20 max-w-[1280px] border-x border-b border-border" />
      <Footer />
    </main>
  );
}
