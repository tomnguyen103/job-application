"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { capturePostHogPageView } from "@/lib/posthog-client";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.location.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = `${url}?${searchParams.toString()}`;
      }
      capturePostHogPageView(url);
    }
  }, [pathname, searchParams]);

  return null;
}
