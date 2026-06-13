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
const MIN_BULLETS_PER_ROLE = 2;

type SanitizerOptions = {
  roleCount: number;
  forbiddenTerms?: string[];
};

/**
 * Collapse consecutive whitespace into single spaces and remove leading/trailing whitespace.
 *
 * @param value - The input string to normalize
 * @returns The input string with consecutive whitespace collapsed to single spaces and trimmed
 */
function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes each string in an array and removes empty entries.
 *
 * @param value - The array of strings to normalize
 * @returns An array where each string has collapsed internal whitespace and trimmed edges, with falsy/empty results removed
 */
function cleanList(value: string[]): string[] {
  return value.map(cleanText).filter(Boolean);
}

/**
 * Creates a case-insensitive regular expression that matches `term` as a standalone token
 * with non-alphanumeric boundaries.
 *
 * The pattern matches occurrences of the cleaned `term` that are either at the start/end of the
 * string or bordered by non-alphanumeric characters, ignoring letter case.
 *
 * @param term - The raw term to build a boundary-aware pattern for
 * @returns A `RegExp` that matches the term with non-alphanumeric boundaries, or `null` if the cleaned term is empty
 */
function termPattern(term: string): RegExp | null {
  const normalized = cleanText(term);

  if (!normalized) {
    return null;
  }

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, "i");
}

/**
 * Checks whether any forbidden term appears in the given text.
 *
 * @returns `true` if any forbidden term matches the text, `false` otherwise.
 */
function containsForbiddenTerm(text: string, forbiddenTerms: string[]): boolean {
  return forbiddenTerms.some((term) => {
    const pattern = termPattern(term);
    return pattern ? pattern.test(text) : false;
  });
}

/**
 * Normalizes a single bullet line for resume output.
 *
 * @param value - The input bullet text to normalize
 * @returns The cleaned bullet with internal whitespace collapsed, trimmed, and any leading bullet marker (`-`, `*`, `•`) removed
 */
function normalizeBullet(value: string): string {
  return cleanText(value).replace(/^[-*\u2022]\s*/, "");
}

/**
 * Extracts the smallest balanced JSON object substring starting at the specified opening brace.
 *
 * Handles nested braces, quoted string regions, and escaped quotes so braces inside strings do not affect balancing.
 *
 * @param text - The string to scan.
 * @param start - Index of the opening `{` from which to begin scanning.
 * @returns The substring from `start` through the matching `}` (inclusive) when a balanced object is found, or `null` if no balanced object is present.
 */
function findBalancedObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Finds the first substring of `text` that is a balanced JSON object and parses as valid JSON.
 *
 * @param text - The string to search for a JSON object
 * @returns The first substring (including its surrounding braces) that parses as a JSON object, or `null` if none is found
 */
export function extractFirstJsonObject(text: string): string | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") {
      continue;
    }

    const candidate = findBalancedObject(text, i);
    if (!candidate) {
      return null;
    }

    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Create the model input payload containing `candidate` and `job` fields used for tailored resume generation.
 *
 * @param profile - Candidate profile: used to populate candidate metadata (current title, experience, location, skills, industries, target roles, education) and a mapped `workExperience` array (company, title, start/end dates with `"Present"` for current roles, and responsibilities).
 * @param job - Saved job data: used to populate job fields including title, company, visible role text (aboutRole, responsibilities, requirements, niceToHave), and skill lists (`matchedSkills`, `missingSkills`). A `descriptionNote` is included to indicate saved job text may be a snippet.
 * @returns The payload object with `candidate` and `job` properties matching the model's expected input shape for prompt construction.
 */
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

/**
 * Builds the instruction prompt that requests a strictly formatted, job‑tailored resume JSON for the given candidate.
 *
 * The prompt embeds structured candidate and job input and enumerates rules the model must follow (required JSON shape, grounding constraints, forbidden terms, role/bullet counts, and style requirements).
 *
 * @param profile - Candidate profile used to populate the prompt (work history, skills, education, etc.)
 * @param job - Saved job details used to tailor output and determine forbidden/missing skills
 * @returns The complete instruction string to send to the model, which directs it to return only a valid JSON object with `professionalSummary` and `roles` in the exact prescribed shape.
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
- Each role: ${MIN_BULLETS_PER_ROLE}-${MAX_BULLETS_PER_ROLE} ATS-friendly bullets, each starting with a strong action verb.
- If a role has little responsibility text, write conservative bullets derivable from its title and provided responsibilities only.
- Keep wording direct, plain, and suitable for a single-column resume.`;
}

/**
 * Validate and normalize a parsed model response into TailoredResumeContent.
 *
 * @param raw - The parsed JSON value produced by the model; expected to be an object containing `professionalSummary` and `roles`.
 * @param options - Sanitization options including `roleCount` (number of roles to extract) and optional `forbiddenTerms` to filter out.
 * @returns A normalized object with `professionalSummary` (cleaned string) and `roles` (array of objects each with `bullets` limited and normalized).
 * @throws Error - If `raw` is not an object.
 * @throws Error - If `professionalSummary` is missing or empty.
 * @throws Error - If `professionalSummary` contains any forbidden term.
 * @throws Error - If any role does not contain at least the required number of bullets (minimum enforced per role).
 */
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

    if (bullets.length < MIN_BULLETS_PER_ROLE) {
      throw new Error(
        `Model response must include at least ${MIN_BULLETS_PER_ROLE} bullets for role ${i + 1}`,
      );
    }

    roles.push({ bullets });
  }

  return { professionalSummary, roles };
}

/**
 * Generates tailored resume content (professional summary and role bullets) for a candidate and a saved job by calling the AI content generator and sanitizing the response.
 *
 * @param profile - Candidate profile used to ground the generated content and determine expected role count
 * @param job - Saved job data used to guide role-specific bullets and forbidden terms filtering
 * @returns A TailoredResumeContent object containing `professionalSummary` and an array of role entries with `bullets`
 * @throws Error if the model response contains no parseable JSON or if the sanitized content fails validation
 */
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
  const jsonPayload = extractFirstJsonObject(text);
  if (!jsonPayload) {
    throw new Error("No JSON object found in model response");
  }

  const raw = JSON.parse(jsonPayload) as unknown;
  return sanitizeTailoredResumeContent(raw, {
    roleCount: profile.workExperience.length,
    forbiddenTerms: job.missingSkills,
  });
}
