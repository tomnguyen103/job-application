import type { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

import {
  createCompanyResearchSession,
  releaseBrowserbaseSession,
} from "@/lib/browserbase";
import {
  fallbackCompanyHomepage,
  getRootDomain,
  homepageFromResolvedUrl,
  isPublicResearchUrl,
  trustedResearchRedirectUrl,
  verifiedCompanyResearchSources,
} from "@/lib/company-research-url";
import { createCompanyResearchStagehand } from "@/lib/stagehand";
import type {
  BrowserResearch,
  CleanHomepageExtraction,
  CleanSubPageExtraction,
  PageLink,
  PageLinkKind,
  ResearchCompanyArgs,
  ResearchLogger,
} from "./research-types";

const pageLinkKindSchema = z.enum([
  "about",
  "careers",
  "blog",
  "engineering",
  "product",
  "team",
  "other",
]);

const homepageExtractionSchema = z.object({
  oneLiner: z.string().optional(),
  productSummary: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  signals: z.array(z.string()).optional(),
  pageLinks: z
    .array(
      z.object({
        url: z.string(),
        kind: pageLinkKindSchema,
      }),
    )
    .optional(),
});

const subPageExtractionSchema = z.object({
  keyPoints: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  valuesOrCulture: z.array(z.string()).optional(),
  notable: z.array(z.string()).optional(),
});

type HomepageExtraction = z.infer<typeof homepageExtractionSchema>;
type SubPageExtraction = z.infer<typeof subPageExtractionSchema>;

const LINK_PRIORITY: Record<PageLinkKind, number> = {
  about: 0,
  engineering: 1,
  product: 2,
  blog: 3,
  team: 4,
  careers: 5,
  other: 6,
};
const RESEARCH_PAGE_TIMEOUT_MS = 30_000;
const MAX_RESEARCH_SUB_PAGES = 2;
const MAX_REDIRECT_HOPS = 5;

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function cleanList(value: string[] | null | undefined, limit = 8): string[] {
  return (value ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

async function fetchPublicRedirectUrl(redirectUrl: string): Promise<string | null> {
  let currentUrl = redirectUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    if (!isPublicResearchUrl(currentUrl)) {
      return null;
    }

    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; JobApplicationResearch/1.0)",
      },
    });
    const location = response.headers.get("location");

    if (
      response.status >= 300 &&
      response.status < 400 &&
      location
    ) {
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return isPublicResearchUrl(response.url) ? response.url : null;
  }

  return null;
}

async function deriveHomepageUrl(
  args: ResearchCompanyArgs,
  logResearchEvent: ResearchLogger,
): Promise<string | null> {
  const { userId, job } = args;
  const redirectUrl = trustedResearchRedirectUrl(job.postUrl);

  if (redirectUrl) {
    try {
      const resolvedUrl = await fetchPublicRedirectUrl(redirectUrl);
      const homepageUrl = resolvedUrl
        ? homepageFromResolvedUrl(resolvedUrl)
        : null;

      if (homepageUrl) {
        return homepageUrl;
      }
    } catch (error) {
      console.error("[agent/research] apply redirect follow failed:", error);
      await logResearchEvent({
        userId,
        jobId: job.id,
        level: "warning",
        message:
          "Could not follow the job post redirect to infer the company homepage.",
      });
    }
  } else if (job.postUrl) {
    await logResearchEvent({
      userId,
      jobId: job.id,
      level: "warning",
      message:
        "Skipped redirect-following because the saved job URL was not a trusted Adzuna URL.",
    });
  }

  return fallbackCompanyHomepage(job.company);
}

function normalizePageLinks(
  links: PageLink[],
  homepageUrl: string,
): PageLink[] {
  const homepage = new URL(homepageUrl);
  const homepageRoot = getRootDomain(homepage.hostname);
  const seen = new Set<string>();
  const normalized: PageLink[] = [];

  for (const link of links) {
    try {
      const url = new URL(link.url, homepageUrl);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        continue;
      }

      if (getRootDomain(url.hostname) !== homepageRoot) {
        continue;
      }

      url.hash = "";
      const href = url.toString().replace(/\/$/, "");

      if (seen.has(href) || href === homepageUrl.replace(/\/$/, "")) {
        continue;
      }

      seen.add(href);
      normalized.push({ url: href, kind: link.kind });
    } catch {
      continue;
    }
  }

  return normalized
    .sort((left, right) => LINK_PRIORITY[left.kind] - LINK_PRIORITY[right.kind])
    .slice(0, MAX_RESEARCH_SUB_PAGES);
}

function cleanHomepageExtraction(
  extraction: HomepageExtraction,
  homepageUrl: string,
): CleanHomepageExtraction {
  return {
    oneLiner: cleanText(extraction.oneLiner),
    productSummary: cleanText(extraction.productSummary),
    technologies: cleanList(extraction.technologies),
    signals: cleanList(extraction.signals),
    pageLinks: normalizePageLinks(extraction.pageLinks ?? [], homepageUrl),
  };
}

function cleanSubPageExtraction(
  extraction: SubPageExtraction,
  page: PageLink,
): CleanSubPageExtraction {
  return {
    url: page.url,
    kind: page.kind,
    keyPoints: cleanList(extraction.keyPoints),
    technologies: cleanList(extraction.technologies),
    valuesOrCulture: cleanList(extraction.valuesOrCulture),
    notable: cleanList(extraction.notable),
  };
}

function isMeaningfulHomepage(homepage: CleanHomepageExtraction): boolean {
  return Boolean(homepage.oneLiner || homepage.productSummary);
}

function isMeaningfulSubPage(page: CleanSubPageExtraction): boolean {
  return Boolean(
    page.keyPoints.length > 0 ||
      page.technologies.length > 0 ||
      page.valuesOrCulture.length > 0 ||
      page.notable.length > 0,
  );
}

async function extractHomepage(
  args: ResearchCompanyArgs,
  stagehand: Stagehand,
  homepageUrl: string,
  logResearchEvent: ResearchLogger,
): Promise<CleanHomepageExtraction | null> {
  try {
    const extraction = await stagehand.extract(
      "This is a company's homepage. Capture what the company actually does, who it is for, any technologies or tools explicitly mentioned on the page, and concrete signals such as funding, customers, scale, mission, or recent launches. Then find the internal links most worth visiting to research them as an employer.",
      homepageExtractionSchema,
      { timeout: RESEARCH_PAGE_TIMEOUT_MS, serverCache: false },
    );

    return cleanHomepageExtraction(extraction, homepageUrl);
  } catch (error) {
    console.error("[agent/research] homepage extraction failed:", error);
    await logResearchEvent({
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message: "Could not extract useful content from the company homepage.",
    });
    return null;
  }
}

async function extractSubPage(
  args: ResearchCompanyArgs,
  stagehand: Stagehand,
  pageLink: PageLink,
  logResearchEvent: ResearchLogger,
): Promise<CleanSubPageExtraction | null> {
  try {
    const extraction = await stagehand.extract(
      "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore navigation, footers, cookie banners, and generic marketing copy.",
      subPageExtractionSchema,
      { timeout: RESEARCH_PAGE_TIMEOUT_MS, serverCache: false },
    );
    const clean = cleanSubPageExtraction(extraction, pageLink);

    return isMeaningfulSubPage(clean) ? clean : null;
  } catch (error) {
    console.error("[agent/research] sub-page extraction failed:", error);
    await logResearchEvent({
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message: `Could not extract content from ${pageLink.kind} page.`,
    });
    return null;
  }
}

export async function collectBrowserResearch(
  args: ResearchCompanyArgs,
  logResearchEvent: ResearchLogger,
): Promise<BrowserResearch> {
  const homepageUrl = await deriveHomepageUrl(args, logResearchEvent);
  const fallbackResearch: BrowserResearch = {
    homepageUrl,
    homepage: null,
    subPages: [],
    sources: [],
  };

  if (!homepageUrl) {
    await logResearchEvent({
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message: "Could not derive a company homepage URL.",
    });
    return fallbackResearch;
  }

  let session:
    | Awaited<ReturnType<typeof createCompanyResearchSession>>
    | null = null;
  let stagehand: Stagehand | null = null;

  try {
    session = await createCompanyResearchSession();
    stagehand = createCompanyResearchStagehand(session.sessionId);
    await stagehand.init();

    const page = await stagehand.context.awaitActivePage();

    try {
      await page.goto(homepageUrl, {
        waitUntil: "networkidle",
        timeoutMs: RESEARCH_PAGE_TIMEOUT_MS,
      });
    } catch (error) {
      console.error("[agent/research] homepage navigation failed:", error);
      await logResearchEvent({
        userId: args.userId,
        jobId: args.job.id,
        level: "warning",
        message: "Could not open the inferred company homepage.",
      });
      return fallbackResearch;
    }

    const homepage = await extractHomepage(
      args,
      stagehand,
      homepageUrl,
      logResearchEvent,
    );

    if (!homepage || !isMeaningfulHomepage(homepage)) {
      await logResearchEvent({
        userId: args.userId,
        jobId: args.job.id,
        level: "warning",
        message:
          "Company homepage research was thin; using the saved job posting for synthesis.",
      });
      return { ...fallbackResearch, homepage };
    }

    const subPages: CleanSubPageExtraction[] = [];

    for (const pageLink of homepage.pageLinks) {
      try {
        await page.goto(pageLink.url, {
          waitUntil: "networkidle",
          timeoutMs: RESEARCH_PAGE_TIMEOUT_MS,
        });
      } catch (error) {
        console.error("[agent/research] sub-page navigation failed:", error);
        await logResearchEvent({
          userId: args.userId,
          jobId: args.job.id,
          level: "warning",
          message: `Could not open ${pageLink.kind} page.`,
        });
        continue;
      }

      const extracted = await extractSubPage(
        args,
        stagehand,
        pageLink,
        logResearchEvent,
      );
      if (extracted) {
        subPages.push(extracted);
      }
    }

    return {
      homepageUrl,
      homepage,
      subPages,
      sources: verifiedCompanyResearchSources({
        homepageUrl,
        includeHomepage: true,
        subPageUrls: subPages.map((page) => page.url),
      }),
    };
  } catch (error) {
    console.error("[agent/research] browser research failed:", error);
    await logResearchEvent({
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message:
        "Browserbase research failed; using the saved job posting for synthesis.",
    });
    return fallbackResearch;
  } finally {
    if (stagehand) {
      try {
        await stagehand.close();
      } catch (error) {
        console.error("[agent/research] Stagehand close failed:", error);
      }
    }

    if (session) {
      await releaseBrowserbaseSession(session.client, session.sessionId);
    }
  }
}
