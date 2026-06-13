import { createGeminiClient } from "@/agent/gemini";
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

type SanitizerOptions = {
  roleCount: number;
  forbiddenTerms?: string[];
};

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function cleanList(value: string[]): string[] {
  return value.map(cleanText).filter(Boolean);
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

function normalizeBullet(value: string): string {
  return cleanText(value).replace(/^[-*\u2022]\s*/, "");
}

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
      title: job.title,
      company: job.company,
      aboutRole: job.aboutRole,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      niceToHave: job.niceToHave,
      matchedSkills: job.matchedSkills,
      missingSkills: job.missingSkills,
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
- Tailor the professional summary and experience bullets to the job title, visible requirements, responsibilities, and matchedSkills.
- Ground every statement strictly in candidate facts. Never invent employers, technologies, tools, certifications, metrics, leadership scope, achievements, degrees, or responsibilities.
- missingSkills are gaps only. Never present missingSkills as candidate skills, experience, keywords, learning goals, or qualifications.
- Saved Adzuna descriptions may be snippets. Do not infer hidden requirements or company details beyond the visible saved fields.
- professionalSummary: 2-3 concise sentences, no first-person pronouns.
- roles: exactly ${profile.workExperience.length} entries, in the same order as candidate.workExperience.
- Each role: 2-${MAX_BULLETS_PER_ROLE} ATS-friendly bullets, each starting with a strong action verb.
- If a role has little responsibility text, write conservative bullets derivable from its title and provided responsibilities only.
- Keep wording direct, plain, and suitable for a single-column resume.`;
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
  const professionalSummary =
    typeof obj.professionalSummary === "string"
      ? cleanText(obj.professionalSummary)
      : "";

  if (!professionalSummary) {
    throw new Error("Model response is missing professionalSummary");
  }

  if (containsForbiddenTerm(professionalSummary, forbiddenTerms)) {
    throw new Error("Model response claims a missing skill in the summary");
  }

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

    if (bullets.length === 0) {
      throw new Error(`Model response is missing bullets for role ${i + 1}`);
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
    config: {
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = (result.text ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in model response");
  }

  const raw = JSON.parse(jsonMatch[0]) as unknown;
  return sanitizeTailoredResumeContent(raw, {
    roleCount: profile.workExperience.length,
    forbiddenTerms: job.missingSkills,
  });
}
