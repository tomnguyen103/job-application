import { Type, type Schema } from "@google/genai";

import { createGeminiClient } from "@/agent/gemini";
import type { Profile } from "@/types";

export type GeneratedResumeContent = {
  professionalSummary: string;
  roles: { bullets: string[] }[];
};

const MAX_BULLETS_PER_ROLE = 4;

type RuntimeSchema = Omit<
  Schema,
  "anyOf" | "items" | "maxItems" | "minItems" | "properties"
> & {
  anyOf?: RuntimeSchema[];
  items?: RuntimeSchema;
  maxItems?: number;
  minItems?: number;
  properties?: Record<string, RuntimeSchema>;
};

const RESUME_RESPONSE_SCHEMA: RuntimeSchema = {
  type: Type.OBJECT,
  required: ["professionalSummary", "roles"],
  propertyOrdering: ["professionalSummary", "roles"],
  properties: {
    professionalSummary: {
      type: Type.STRING,
      description:
        "A concise professional resume summary grounded only in candidate data.",
    },
    roles: {
      type: Type.ARRAY,
      minItems: 0,
      items: {
        type: Type.OBJECT,
        required: ["bullets"],
        properties: {
          bullets: {
            type: Type.ARRAY,
            minItems: 1,
            maxItems: MAX_BULLETS_PER_ROLE,
            items: {
              type: Type.STRING,
            },
          },
        },
      },
    },
  },
};

function buildPrompt(profile: Profile): string {
  const candidateData = {
    currentTitle: profile.currentTitle,
    experienceLevel: profile.experienceLevel,
    yearsExperience: profile.yearsExperience,
    location: profile.location,
    skills: profile.skills,
    industries: profile.industries,
    workExperience: profile.workExperience.map((role) => ({
      company: role.company,
      title: role.title,
      startDate: role.startDate,
      endDate: role.currentlyWorking ? "Present" : role.endDate,
      responsibilities: role.responsibilities,
    })),
    education: profile.education,
  };

  return `You are an expert resume writer. Rewrite the candidate data below into polished professional resume content.

CANDIDATE DATA:
${JSON.stringify(candidateData, null, 2)}

Return ONLY valid JSON with this exact shape — no markdown, no code fences, no extra text:
{
  "professionalSummary": "string",
  "roles": [
    { "bullets": ["string", "string", "string"] }
  ]
}

Rules:
- professionalSummary: 2-3 sentences covering the candidate's title, years of experience, core skills, and industries — written in professional resume style with no first-person pronouns
- roles: exactly ${profile.workExperience.length} entries, in the same order as workExperience above
- Each role: 2-${MAX_BULLETS_PER_ROLE} concise bullet points rewritten from its responsibilities text, each starting with a strong action verb
- Ground every statement strictly in the provided data — never invent employers, technologies, metrics, or achievements that are not present
- If a role has no responsibilities text, write 1-2 conservative bullets derivable from its job title alone, with no invented specifics
- Keep everything concise enough to fit a single-page resume`;
}

function sanitize(raw: unknown, roleCount: number): GeneratedResumeContent {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model response is not a JSON object");
  }

  const obj = raw as Record<string, unknown>;

  const professionalSummary =
    typeof obj.professionalSummary === "string"
      ? obj.professionalSummary.trim()
      : "";
  if (!professionalSummary) {
    throw new Error("Model response is missing professionalSummary");
  }

  const rawRoles = Array.isArray(obj.roles) ? (obj.roles as unknown[]) : [];
  const roles: { bullets: string[] }[] = [];

  for (let i = 0; i < roleCount; i++) {
    const entry = rawRoles[i];
    const rawBullets =
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>).bullets
        : null;

    const bullets = (Array.isArray(rawBullets) ? rawBullets : [])
      .filter((b): b is string => typeof b === "string")
      .map((b) => b.trim())
      .filter(Boolean)
      .slice(0, MAX_BULLETS_PER_ROLE);

    if (bullets.length === 0) {
      throw new Error(`Model response is missing bullets for role ${i + 1}`);
    }

    roles.push({ bullets });
  }

  return { professionalSummary, roles };
}

export async function generateResumeContent(
  profile: Profile,
): Promise<GeneratedResumeContent> {
  const ai = createGeminiClient();
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: buildPrompt(profile) }] }],
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: RESUME_RESPONSE_SCHEMA as unknown as Schema,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = (result.text ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in model response");
  }

  const raw = JSON.parse(jsonMatch[0]) as unknown;
  return sanitize(raw, profile.workExperience.length);
}
