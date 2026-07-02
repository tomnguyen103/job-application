import {
  createGeminiClient,
  parseGeminiJsonResponse,
  withGeminiTimeout,
} from "@/agent/gemini";
import {
  sanitizeCompanyResearchDossier,
} from "@/lib/company-research";
import {
  filterCompanyTechStackToEvidence,
} from "@/lib/company-research-tech";
import type { CompanyResearchDossier, Profile } from "@/types";
import {
  buildFallbackDossier,
  companyTechEvidence,
} from "./research-fallback";
import type {
  BrowserResearch,
  CompanyResearchJob,
  ResearchCompanyArgs,
  ResearchLogger,
} from "./research-types";

export function buildSynthesisPrompt(
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

export async function synthesizeDossier(
  args: ResearchCompanyArgs,
  browserResearch: BrowserResearch,
  logResearchEvent: ResearchLogger,
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
      config: withGeminiTimeout({
        temperature: 0.4,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      }),
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
    await logResearchEvent({
      userId: args.userId,
      jobId: args.job.id,
      level: "warning",
      message:
        "AI synthesis failed; saved a conservative dossier from the job posting.",
    });
    return fallback;
  }
}
