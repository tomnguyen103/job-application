import { createGeminiClient } from "@/agent/gemini";
import type { Education, Profile, WorkExperience } from "@/types";

const VALID_DEGREES = new Set([
  "high_school",
  "associate",
  "bachelors",
  "masters",
  "phd",
]);

const VALID_EXP_LEVELS = new Set(["junior", "mid", "senior", "lead"]);

const PROMPT = `Extract professional profile information from this resume PDF.

Return ONLY valid JSON with this exact shape — no markdown, no code fences, no extra text:
{
  "fullName": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedinUrl": "string or null",
  "portfolioUrl": "string or null",
  "currentTitle": "string or null",
  "experienceLevel": "junior or mid or senior or lead or null",
  "yearsExperience": "string number or null",
  "skills": ["array of skill strings"],
  "industries": ["array of industry strings"],
  "workExperience": [
    {
      "company": "string",
      "title": "string",
      "startDate": "e.g. January 2022",
      "endDate": "e.g. March 2024 — empty string if current",
      "currentlyWorking": "true when this is their current role, else false",
      "responsibilities": "summary of key work"
    }
  ],
  "education": {
    "degree": "high_school or associate or bachelors or masters or phd or null",
    "fieldOfStudy": "string or null",
    "institution": "string or null",
    "graduationYear": "string or null"
  },
  "jobTitlesSeeking": "string or null",
  "salaryExpectation": "string or null"
}

Rules:
- Return null for any field not found in the resume — never invent data
- skills: every technical and professional skill explicitly mentioned
- industries: infer from work history (e.g. FinTech, SaaS, Healthcare)
- yearsExperience: if the resume states a total (e.g. "7 years of experience"), use that number; otherwise compute from the earliest start date to the latest end date, counting overlapping roles only once — never sum overlapping date ranges. Return a plain number string e.g. "5"
- experienceLevel: infer from that same total (0-2: junior, 3-5: mid, 6-9: senior, 10+: lead), lowercase exactly as listed
- workExperience: up to 3 most recent roles only
- currentlyWorking: true when the role's end date reads Present/Current/Now — endDate must then be an empty string
- linkedinUrl and portfolioUrl: only real personal URLs (e.g. linkedin.com/in/name, github.com/username, a personal site). A bare site name with no personal path — like "linkedin.com" or "https://github.com" alone — is a template placeholder: return null
- degree must be exactly one of: high_school, associate, bachelors, masters, phd (or null), lowercase exactly as listed
- Return [] for empty arrays, never null for array fields`;

export type RawExtracted = {
  fullName?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  currentTitle?: string | null;
  experienceLevel?: string | null;
  yearsExperience?: string | number | null;
  skills?: unknown;
  industries?: unknown;
  workExperience?: unknown;
  education?: {
    degree?: string | null;
    fieldOfStudy?: string | null;
    institution?: string | null;
    graduationYear?: string | number | null;
  } | null;
  jobTitlesSeeking?: string | null;
  salaryExpectation?: string | null;
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// Resume templates ship bare "linkedin.com" / "github.com" placeholder links
// that identify nobody, and a schemeless value would fail the profile form's
// type="url" validation and silently block saving.
const PLACEHOLDER_URL_HOSTS = new Set([
  "linkedin.com",
  "www.linkedin.com",
  "github.com",
  "www.github.com",
]);

function cleanProfileUrl(value: unknown): string {
  const v = str(value);
  if (!v) return "";
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return "";
  }
  if (!url.hostname.includes(".")) return "";
  if (PLACEHOLDER_URL_HOSTS.has(url.hostname) && url.pathname === "/") {
    return "";
  }
  return withScheme;
}

export function sanitizeExtractedProfile(raw: RawExtracted): Partial<Profile> {
  const result: Partial<Profile> = {};

  const textFields = [
    ["fullName", raw.fullName],
    ["phone", raw.phone],
    ["location", raw.location],
    ["currentTitle", raw.currentTitle],
    ["jobTitlesSeeking", raw.jobTitlesSeeking],
    ["salaryExpectation", raw.salaryExpectation],
  ] as const;

  for (const [field, value] of textFields) {
    const v = str(value);
    if (v) result[field] = v;
  }

  const linkedinUrl = cleanProfileUrl(raw.linkedinUrl);
  if (linkedinUrl) result.linkedinUrl = linkedinUrl;

  const portfolioUrl = cleanProfileUrl(raw.portfolioUrl);
  if (portfolioUrl) result.portfolioUrl = portfolioUrl;

  const expLevel = str(raw.experienceLevel).toLowerCase();
  if (VALID_EXP_LEVELS.has(expLevel)) {
    result.experienceLevel = expLevel;
  }

  if (raw.yearsExperience != null) {
    const s = String(raw.yearsExperience).trim();
    const n = Number(s);
    if (s && Number.isFinite(n) && n >= 0) {
      result.yearsExperience = String(Math.round(n));
    }
  }

  if (Array.isArray(raw.skills)) {
    const skills = (raw.skills as unknown[])
      .map(String)
      .filter((s) => s.trim());
    if (skills.length > 0) result.skills = skills;
  }

  if (Array.isArray(raw.industries)) {
    const industries = (raw.industries as unknown[])
      .map(String)
      .filter((s) => s.trim());
    if (industries.length > 0) result.industries = industries;
  }

  if (Array.isArray(raw.workExperience) && raw.workExperience.length > 0) {
    const roles: WorkExperience[] = (raw.workExperience as unknown[])
      .slice(0, 3)
      .filter((r) => r && typeof r === "object")
      .map((r) => {
        const role = r as Record<string, unknown>;
        const endDate = str(role.endDate);
        // Reconcile the pair: an endDate of "Present" means a current role
        // even when the model leaves currentlyWorking false.
        const currentlyWorking =
          role.currentlyWorking === true ||
          /^(present|current|now)$/i.test(endDate);
        return {
          company: str(role.company),
          title: str(role.title),
          startDate: str(role.startDate),
          endDate: currentlyWorking ? "" : endDate,
          currentlyWorking,
          responsibilities: str(role.responsibilities),
        };
      })
      .filter((r) => r.company || r.title);

    if (roles.length > 0) result.workExperience = roles;
  }

  if (raw.education && typeof raw.education === "object") {
    const edu = raw.education;
    const degree = str(edu.degree).toLowerCase();
    const education: Education = {
      degree: VALID_DEGREES.has(degree) ? degree : "high_school",
      fieldOfStudy: str(edu.fieldOfStudy),
      institution: str(edu.institution),
      graduationYear:
        edu.graduationYear != null ? String(edu.graduationYear).trim() : "",
    };
    if (education.institution || education.fieldOfStudy) {
      result.education = education;
    }
  }

  return result;
}

export async function extractProfileFromPdf(
  pdfBase64: string,
): Promise<Partial<Profile>> {
  const ai = createGeminiClient();
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
          { text: PROMPT },
        ],
      },
    ],
    // Thinking disabled — extraction is structured extraction, and the default
    // thinking budget dominates per-call latency on flash (minutes for a full
    // PDF; same finding as agent/matcher.ts scoring).
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = (result.text ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in model response");
  }

  const raw = JSON.parse(jsonMatch[0]) as RawExtracted;
  return sanitizeExtractedProfile(raw);
}
