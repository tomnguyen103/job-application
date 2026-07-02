import {
  sanitizeCompanyResearchDossier,
} from "@/lib/company-research";
import {
  deriveCompanyTechStack,
  type CompanyTechEvidence,
} from "@/lib/company-research-tech";
import type { CompanyResearchDossier, Profile } from "@/types";
import type { BrowserResearch, CompanyResearchJob } from "./research-types";

export function buildFallbackDossier(
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

export function emptyBrowserResearch(): BrowserResearch {
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

export function companyTechEvidence(
  job: CompanyResearchJob,
  browserResearch: BrowserResearch,
): CompanyTechEvidence {
  return {
    researchTechnologies: companyResearchTechnologies(browserResearch),
    jobDescription: job.description,
  };
}
