import type { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

import { createGeminiClient, parseGeminiJsonResponse } from "@/agent/gemini";
import {
  createCompanyResearchSession,
  releaseBrowserbaseSession,
} from "@/lib/browserbase";
import {
  sanitizeCompanyResearchDossier,
} from "@/lib/company-research";
import {
  deriveCompanyTechStack,
  filterCompanyTechStackToEvidence,
  type CompanyTechEvidence,
} from "@/lib/company-research-tech";
import {
  fallbackCompanyHomepage,
  getRootDomain,
  homepageFromResolvedUrl,
  trustedResearchRedirectUrl,
  verifiedCompanyResearchSources,
} from "@/lib/company-research-url";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createCompanyResearchStagehand } from "@/lib/stagehand";
import type { CompanyResearchDossier, Profile } from "@/types";

type InsforgeServer = Awaited<ReturnType<typeof createInsforgeServer>>;
type LogLevel = "info" | "success" | "warning" | "error";

export type CompanyResearchJob = {
  id: string;
  title: string;
  company: string;
  description: string;
  postUrl: string | null;
  matchedSkills: string[];
  missingSkills: string[];
};

type ResearchCompanyArgs = {
  insforge: InsforgeServer;
  userId: string;
  job: CompanyResearchJob;
  profile: Profile;
};

type BrowserResearch = {
  homepageUrl: string | null;
  homepage: CleanHomepageExtraction | null;
  subPages: CleanSubPageExtraction[];
  sources: string[];
};

type CleanHomepageExtraction = {
  oneLiner: string;
  productSummary: string;
  technologies: string[];
  signals: string[];
  pageLinks: PageLink[];
};

type CleanSubPageExtraction = {
  url: string;
  kind: PageLinkKind;
  keyPoints: string[];
  technologies: string[];
  valuesOrCulture: string[];
  notable: string[];
};

type PageLink = {
  url: string;
  kind: PageLinkKind;
};

const pageLinkKindSchema = z.enum([
  "about",
  "careers",
  "blog",
  "engineering",
  "product",
  "team",
  "other",
]);

type PageLinkKind = z.infer<typeof pageLinkKindSchema>;

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

async function logResearchEvent(
  insforge: InsforgeServer,
  entry: {
    userId: string;
    jobId: string;
    message: string;
    level: LogLevel;
  },
): Promise<void> {
  const { error } = await insforge.database.from("agent_logs").insert([
    {
      run_id: null,
      user_id: entry.userId,
      job_id: entry.jobId,
      message: entry.message,
      level: entry.level,
    },
  ]);

  if (error) {
    console.error("[agent/research] failed to write agent log:", error);
  }
}

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function cleanList(value: string[] | null | undefined, limit = 8): string[] {
  return (value ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

async function deriveHomepageUrl(
  args: ResearchCompanyArgs,
): Promise<string | null> {
  const { insforge, userId, job } = args;
  const redirectUrl = trustedResearchRedirectUrl(job.postUrl);

  if (redirectUrl) {
    try {
      const response = await fetch(redirectUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; JobApplicationResearch/1.0)",
        },
      });
      const homepageUrl = homepageFromResolvedUrl(response.url);

      if (homepageUrl) {
        return homepageUrl;
      }
    } catch (error) {
      console.error("[agent/research] apply redirect follow failed:", error);
      await logResearchEvent(insforge, {
        userId,
        jobId: job.id,
        level: "warning",
        message:
          "Could not follow the job post redirect to infer the company homepage.",
      });
    }
  } else if (job.postUrl) {
    await logResearchEvent(insforge, {
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
    .slice(0, 3);
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
): Promise<CleanHomepageExtraction | null> {
  try {
    const extraction = await stagehand.extract(
      "This is a company's homepage. Capture what the company actually does, who it is for, any technologies or tools explicitly mentioned on the page, and concrete signals such as funding, customers, scale, mission, or recent launches. Then find the internal links most worth visiting to research them as an employer.",
      homepageExtractionSchema,
      { timeout: 30_000, serverCache: false },
    );

    return cleanHomepageExtraction(extraction, homepageUrl);
  } catch (error) {
    console.error("[agent/research] homepage extraction failed:", error);
    await logResearchEvent(args.insforge, {
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
): Promise<CleanSubPageExtraction | null> {
  try {
    const extraction = await stagehand.extract(
      "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore navigation, footers, cookie banners, and generic marketing copy.",
      subPageExtractionSchema,
      { timeout: 30_000, serverCache: false },
    );
    const clean = cleanSubPageExtraction(extraction, pageLink);

    return isMeaningfulSubPage(clean) ? clean : null;
  } catch (error) {
    console.error("[agent/research] sub-page extraction failed:", error);
    await logResearchEvent(args.insforge, {
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message: `Could not extract content from ${pageLink.kind} page.`,
    });
    return null;
  }
}

async function collectBrowserResearch(
  args: ResearchCompanyArgs,
): Promise<BrowserResearch> {
  const homepageUrl = await deriveHomepageUrl(args);
  const fallbackResearch: BrowserResearch = {
    homepageUrl,
    homepage: null,
    subPages: [],
    sources: [],
  };

  if (!homepageUrl) {
    await logResearchEvent(args.insforge, {
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
        timeoutMs: 30_000,
      });
    } catch (error) {
      console.error("[agent/research] homepage navigation failed:", error);
      await logResearchEvent(args.insforge, {
        userId: args.userId,
        jobId: args.job.id,
        level: "warning",
        message: "Could not open the inferred company homepage.",
      });
      return fallbackResearch;
    }

    const homepage = await extractHomepage(args, stagehand, homepageUrl);

    if (!homepage || !isMeaningfulHomepage(homepage)) {
      await logResearchEvent(args.insforge, {
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
          timeoutMs: 30_000,
        });
      } catch (error) {
        console.error("[agent/research] sub-page navigation failed:", error);
        await logResearchEvent(args.insforge, {
          userId: args.userId,
          jobId: args.job.id,
          level: "warning",
          message: `Could not open ${pageLink.kind} page.`,
        });
        continue;
      }

      const extracted = await extractSubPage(args, stagehand, pageLink);
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
    await logResearchEvent(args.insforge, {
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

function buildFallbackDossier(
  job: CompanyResearchJob,
  profile: Profile,
  browserResearch: BrowserResearch,
): CompanyResearchDossier {
  const matched = job.matchedSkills.slice(0, 4);
  const missing = job.missingSkills.slice(0, 4);
  const techStack = deriveCompanyTechStack(
    companyTechEvidence(job, browserResearch),
  );

  return sanitizeCompanyResearchDossier({
    companyOverview: `${job.company} is the employer for this ${job.title} role. Public company research was limited, so this briefing is grounded in the saved job posting and your profile.`,
    techStack,
    culture: [
      "Public culture signals were limited; ask about team norms, review cadence, and how engineering decisions are made.",
    ],
    whyThisRole: `The posting suggests ${job.company} needs help in the area covered by the ${job.title} role. Use the job description as the strongest signal for why this opening exists.`,
    yourEdge:
      matched.length > 0
        ? matched.map(
            (skill) =>
              `Your ${skill} experience is directly relevant to the role requirements.`,
          )
        : [
            `Your ${profile.currentTitle || "current"} background gives you a starting point for this role; lead with the projects closest to the posting.`,
          ],
    gapsToAddress:
      missing.length > 0
        ? missing.map(
            (skill) =>
              `Prepare an honest bridge for ${skill}: name adjacent experience and how you would ramp quickly.`,
          )
        : [
            "No major gaps were captured in the saved match data; prepare examples that prove depth, not just familiarity.",
          ],
    smartQuestions: [
      `What are the most important outcomes for the ${job.title} role in the first 90 days?`,
      "Which parts of the product or workflow would this hire touch most often?",
      "What technical or process constraints should a new hire understand before joining?",
    ],
    interviewPrep: [
      "Prepare two concise stories that connect your strongest matched skills to the role.",
      "Review the saved job description and be ready to discuss the missing skills as ramp areas.",
      "Ask for concrete details about the team, stack, and success metrics.",
    ],
    sources: browserResearch.sources,
  });
}

function emptyBrowserResearch(): BrowserResearch {
  return {
    homepageUrl: null,
    homepage: null,
    subPages: [],
    sources: [],
  };
}

function companyResearchTechnologies(
  browserResearch: BrowserResearch,
): string[] {
  return [
    ...(browserResearch.homepage?.technologies ?? []),
    ...browserResearch.subPages.flatMap((page) => page.technologies),
  ];
}

function companyTechEvidence(
  job: CompanyResearchJob,
  browserResearch: BrowserResearch,
): CompanyTechEvidence {
  return {
    researchTechnologies: companyResearchTechnologies(browserResearch),
    jobDescription: job.description,
  };
}

function buildSynthesisPrompt(
  job: CompanyResearchJob,
  profile: Profile,
  browserResearch: BrowserResearch,
): string {
  const profileData = {
    currentTitle: profile.currentTitle,
    experienceLevel: profile.experienceLevel,
    yearsExperience: profile.yearsExperience,
    skills: profile.skills,
    industries: profile.industries,
    workExperience: profile.workExperience.map((role) => ({
      company: role.company,
      title: role.title,
      responsibilities: role.responsibilities,
    })),
    education: profile.education,
  };

  return `You are a sharp career strategist preparing a candidate to apply for a specific role.

You are given:
1. Research collected from the company's own public website.
2. The saved job posting.
3. The candidate's profile.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, technologies, or facts.
- If research is thin, infer carefully from the job posting and say what is inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, role, and values.
- Tech stack must include only technologies explicitly present in the company research or job posting. Do not copy candidate profile skills or matchedSkills into techStack. If no company/job technology evidence exists, return an empty techStack array.
- Turn missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Smart questions must reference real things from the research or posting.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": "string",
  "techStack": ["string"],
  "culture": ["string"],
  "whyThisRole": "string",
  "yourEdge": ["string"],
  "gapsToAddress": ["string"],
  "smartQuestions": ["string"],
  "interviewPrep": ["string"],
  "sources": ["string"]
}

COMPANY RESEARCH:
${JSON.stringify(browserResearch, null, 2)}

JOB POSTING:
${JSON.stringify(
  {
    title: job.title,
    company: job.company,
    description: job.description,
    matchedSkills: job.matchedSkills,
    missingSkills: job.missingSkills,
  },
  null,
  2,
)}

CANDIDATE PROFILE:
${JSON.stringify(profileData, null, 2)}`;
}

async function synthesizeDossier(
  args: ResearchCompanyArgs,
  browserResearch: BrowserResearch,
): Promise<CompanyResearchDossier> {
  const fallback = buildFallbackDossier(args.job, args.profile, browserResearch);
  const techEvidence = companyTechEvidence(args.job, browserResearch);

  try {
    const ai = createGeminiClient();
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildSynthesisPrompt(
                args.job,
                args.profile,
                browserResearch,
              ),
            },
          ],
        },
      ],
      config: {
        temperature: 0.4,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const raw: unknown = parseGeminiJsonResponse<unknown>(result.text ?? "");
    const dossier = sanitizeCompanyResearchDossier(raw, fallback);
    return {
      ...dossier,
      techStack: filterCompanyTechStackToEvidence(
        dossier.techStack,
        techEvidence,
      ),
    };
  } catch (error) {
    console.error("[agent/research] dossier synthesis failed:", error);
    await logResearchEvent(args.insforge, {
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message:
        "AI synthesis failed; saved a conservative dossier from the job posting.",
    });
    return fallback;
  }
}

export async function researchCompany(
  args: ResearchCompanyArgs,
): Promise<{ success: true; dossier: CompanyResearchDossier }> {
  try {
    await logResearchEvent(args.insforge, {
      userId: args.userId,
      jobId: args.job.id,
      level: "info",
      message: `Researching ${args.job.company} for "${args.job.title}".`,
    });

    const browserResearch = await collectBrowserResearch(args);
    const dossier = await synthesizeDossier(args, browserResearch);

    await logResearchEvent(args.insforge, {
      userId: args.userId,
      jobId: args.job.id,
      level: "success",
      message: `Company research saved for ${args.job.company}.`,
    });

    return { success: true, dossier };
  } catch (error) {
    console.error("[agent/research]", error);
    await logResearchEvent(args.insforge, {
      userId: args.userId,
      jobId: args.job.id,
      level: "error",
      message:
        "Company research failed unexpectedly; saved a conservative dossier.",
    });

    return {
      success: true,
      dossier: buildFallbackDossier(
        args.job,
        args.profile,
        emptyBrowserResearch(),
      ),
    };
  }
}
