import { Type, type Schema } from "@google/genai";

import {
  createGeminiClient,
  extractFirstJsonObject,
  parseGeminiJsonResponse,
  withGeminiTimeout,
} from "@/agent/gemini";
import type { Profile } from "@/types";

export type TailoredResumeJob = {
  id: string;
  title: string;
  company: string;
  aboutRole: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  matchedSkills: string[];
  missingSkills: string[];
};

export type TailoredResumeContent = {
  professionalSummary: string;
  roles: { bullets: string[] }[];
};

const MAX_BULLETS_PER_ROLE = 4;
const MIN_BULLETS_PER_ROLE = 2;
const TAILORED_RESUME_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ["professionalSummary", "roles"],
  propertyOrdering: ["professionalSummary", "roles"],
  properties: {
    professionalSummary: {
      type: Type.STRING,
      description: "A concise resume summary grounded only in profile-backed strengths.",
    },
    roles: {
      type: Type.ARRAY,
      minItems: "1",
      items: {
        type: Type.OBJECT,
        required: ["bullets"],
        properties: {
          bullets: {
            type: Type.ARRAY,
            minItems: String(MIN_BULLETS_PER_ROLE),
            maxItems: String(MAX_BULLETS_PER_ROLE),
            items: {
              type: Type.STRING,
            },
          },
        },
      },
    },
  },
};

type SanitizerOptions = {
  roleCount: number;
  forbiddenTerms?: string[];
  fallbackProfessionalSummary?: string;
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanList(value: string[]): string[] {
  return value.map(cleanText).filter(Boolean);
}

export function targetRoleLabel(job: TailoredResumeJob): string {
  return [cleanText(job.title), cleanText(job.company)]
    .filter(Boolean)
    .join(" at ");
}

function uniqueList(items: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of cleanList(items)) {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

function buildVisibleJobSignals(job: TailoredResumeJob): string[] {
  return uniqueList([
    job.title,
    job.aboutRole,
    ...job.requirements,
    ...job.responsibilities,
    ...job.niceToHave,
    ...job.matchedSkills,
  ]).slice(0, 18);
}

function termPattern(term: string): RegExp | null {
  const normalized = cleanText(term);

  if (!normalized) {
    return null;
  }

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, "i");
}

function containsForbiddenTerm(text: string, forbiddenTerms: string[]): boolean {
  return forbiddenTerms.some((term) => {
    const pattern = termPattern(term);
    return pattern ? pattern.test(text) : false;
  });
}

function safeText(value: string, forbiddenTerms: string[]): string {
  const text = cleanText(value);
  return text && !containsForbiddenTerm(text, forbiddenTerms) ? text : "";
}

function normalizeBullet(value: string): string {
  return cleanText(value).replace(/^[-*\u2022]\s*/, "");
}

function safeProfessionalSummary(
  summary: string,
  fallback: string,
  forbiddenTerms: string[],
): string {
  if (!containsForbiddenTerm(summary, forbiddenTerms)) {
    return summary;
  }

  const safeSentences = summary
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean)
    .filter((sentence) => !containsForbiddenTerm(sentence, forbiddenTerms));
  const repaired = cleanText(safeSentences.join(" "));

  if (repaired) {
    return repaired;
  }

  const safeFallback = safeText(fallback, forbiddenTerms);
  if (safeFallback) {
    return safeFallback;
  }

  throw new Error("Model response claims a missing skill in the summary");
}

// Re-export extractFirstJsonObject for backward compatibility
export { extractFirstJsonObject };

export function buildTailoredResumeInput(
  profile: Profile,
  job: TailoredResumeJob,
): Record<string, unknown> {
  return {
    candidate: {
      currentTitle: profile.currentTitle,
      experienceLevel: profile.experienceLevel,
      yearsExperience: profile.yearsExperience,
      location: profile.location,
      workAuthorization: profile.workAuthorization,
      skills: profile.skills,
      industries: profile.industries,
      targetRoles: profile.jobTitlesSeeking,
      workExperience: profile.workExperience.map((role) => ({
        company: role.company,
        title: role.title,
        startDate: role.startDate,
        endDate: role.currentlyWorking ? "Present" : role.endDate,
        responsibilities: role.responsibilities,
      })),
      education: profile.education,
    },
    job: {
      targetRole: targetRoleLabel(job),
      title: job.title,
      company: job.company,
      aboutRole: job.aboutRole,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      niceToHave: job.niceToHave,
      matchedSkills: job.matchedSkills,
      missingSkills: job.missingSkills,
      visibleJobSignals: buildVisibleJobSignals(job),
      descriptionNote:
        "Saved Adzuna job descriptions may be snippets. Do not infer requirements or company facts that are not visible here.",
    },
  };
}

export function buildTailoredResumePrompt(
  profile: Profile,
  job: TailoredResumeJob,
): string {
  const input = buildTailoredResumeInput(profile, job);

  return `You are an expert ATS resume writer. Rewrite resume content for the saved job using only the provided candidate facts and saved job details.

INPUT:
${JSON.stringify(input, null, 2)}

Return ONLY valid JSON with this exact shape, no markdown, no code fences, no extra text:
{
  "professionalSummary": "string",
  "roles": [
    { "bullets": ["string", "string", "string"] }
  ]
}

Rules:
- Make the rewrite visibly job-specific, not just a generic profile polish. Use the targetRole, aboutRole snippet, visibleJobSignals, and matchedSkills to decide what to emphasize.
- Tailor the professional summary and experience bullets to the job title, visible requirements, responsibilities, and matchedSkills.
- professionalSummary must name or clearly point to the target role when a targetRole is provided. Do not imply the candidate already works for the target company unless that is true in candidate.workExperience.
- When requirements and responsibilities are empty, treat aboutRole and matchedSkills as the only visible job signals and still align the wording to those signals where the profile supports it.
- Ground every statement strictly in candidate facts. Never invent employers, technologies, tools, certifications, metrics, leadership scope, achievements, degrees, or responsibilities.
- missingSkills are gaps only. Never present missingSkills as candidate skills, experience, keywords, learning goals, or qualifications.
- Saved Adzuna descriptions may be snippets. Do not infer hidden requirements or company details beyond the visible saved fields.
- professionalSummary: 2-3 concise sentences, no first-person pronouns.
- roles: exactly ${profile.workExperience.length} entries, in the same order as candidate.workExperience.
- Each role: ${MIN_BULLETS_PER_ROLE}-${MAX_BULLETS_PER_ROLE} ATS-friendly bullets, each starting with a strong action verb and prioritizing profile facts that overlap with visibleJobSignals.
- If a role has little responsibility text, write conservative bullets derivable from its title and provided responsibilities only.
- Keep wording direct, plain, and suitable for a single-column resume.`;
}

export function buildFallbackProfessionalSummary(
  profile: Profile,
  job: TailoredResumeJob,
): string {
  const forbiddenTerms = cleanList(job.missingSkills);
  const title = safeText(profile.currentTitle, forbiddenTerms) || "Candidate";
  const years = safeText(profile.yearsExperience, forbiddenTerms);
  const roleLabel = safeText(targetRoleLabel(job), forbiddenTerms);
  const matchedSkills = uniqueList(job.matchedSkills)
    .filter((skill) => !containsForbiddenTerm(skill, forbiddenTerms))
    .slice(0, 3);
  const industries = uniqueList(profile.industries)
    .filter((industry) => !containsForbiddenTerm(industry, forbiddenTerms))
    .slice(0, 2);

  const experiencePhrase = years
    ? `${years} years of experience`
    : "profile-backed experience";
  const skillPhrase =
    matchedSkills.length > 0 ? ` across ${matchedSkills.join(", ")}` : "";
  const industryPhrase =
    industries.length > 0 ? ` in ${industries.join(" and ")}` : "";
  const rolePhrase = roleLabel ? ` for ${roleLabel}` : " for the saved role";

  return `${title} with ${experiencePhrase}${skillPhrase}${industryPhrase}. Aligns saved profile experience with the job-specific priorities${rolePhrase}.`;
}

export function sanitizeTailoredResumeContent(
  raw: unknown,
  options: SanitizerOptions,
): TailoredResumeContent {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model response is not a JSON object");
  }

  const forbiddenTerms = cleanList(options.forbiddenTerms ?? []);
  const obj = raw as Record<string, unknown>;
  const rawProfessionalSummary =
    typeof obj.professionalSummary === "string"
      ? cleanText(obj.professionalSummary)
      : "";

  if (!rawProfessionalSummary) {
    throw new Error("Model response is missing professionalSummary");
  }

  const professionalSummary = safeProfessionalSummary(
    rawProfessionalSummary,
    options.fallbackProfessionalSummary ?? "",
    forbiddenTerms,
  );

  const rawRoles = Array.isArray(obj.roles) ? (obj.roles as unknown[]) : [];
  const roles: { bullets: string[] }[] = [];

  for (let i = 0; i < options.roleCount; i++) {
    const entry = rawRoles[i];
    const rawBullets =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>).bullets
        : null;

    const bullets = (Array.isArray(rawBullets) ? rawBullets : [])
      .filter((bullet): bullet is string => typeof bullet === "string")
      .map(normalizeBullet)
      .filter(Boolean)
      .filter((bullet) => !containsForbiddenTerm(bullet, forbiddenTerms))
      .slice(0, MAX_BULLETS_PER_ROLE);

    if (bullets.length < MIN_BULLETS_PER_ROLE) {
      throw new Error(
        `Model response must include at least ${MIN_BULLETS_PER_ROLE} bullets for role ${i + 1}`,
      );
    }

    roles.push({ bullets });
  }

  return { professionalSummary, roles };
}

export async function generateTailoredResumeContent({
  profile,
  job,
}: {
  profile: Profile;
  job: TailoredResumeJob;
}): Promise<TailoredResumeContent> {
  const ai = createGeminiClient();
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: buildTailoredResumePrompt(profile, job) }] },
    ],
    config: withGeminiTimeout({
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: TAILORED_RESUME_RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    }),
  });

  const raw = parseGeminiJsonResponse<unknown>(result.text ?? "");
  return sanitizeTailoredResumeContent(raw, {
    roleCount: profile.workExperience.length,
    forbiddenTerms: job.missingSkills,
    fallbackProfessionalSummary: buildFallbackProfessionalSummary(profile, job),
  });
}
