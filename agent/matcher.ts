import { GoogleGenAI } from "@google/genai";

import type { JobMatchContent, UsableAdzunaJob } from "@/agent/types";
import type { Profile } from "@/types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function buildPrompt(profile: Profile, job: UsableAdzunaJob): string {
  const candidate = {
    currentTitle: profile.currentTitle,
    experienceLevel: profile.experienceLevel,
    yearsExperience: profile.yearsExperience,
    location: profile.location,
    remotePreference: profile.remotePreference,
    jobTitlesSeeking: profile.jobTitlesSeeking,
    skills: profile.skills,
    industries: profile.industries,
    workExperience: profile.workExperience.map((role) => ({
      company: role.company,
      title: role.title,
      responsibilities: role.responsibilities,
    })),
    education: profile.education,
  };

  const jobPosting = {
    title: job.title,
    company: job.company.display_name,
    location: job.location?.display_name ?? "",
    contractType: job.contract_type ?? "",
    descriptionSnippet: job.description,
  };

  return `You are an expert technical recruiter. Score how well the candidate below fits the job posting below.

CANDIDATE PROFILE:
${JSON.stringify(candidate, null, 2)}

JOB POSTING:
${JSON.stringify(jobPosting, null, 2)}

Return ONLY valid JSON with this exact shape — no markdown, no code fences, no extra text:
{
  "matchScore": 0,
  "matchReason": "string",
  "matchedSkills": ["string"],
  "missingSkills": ["string"]
}

Rules:
- matchScore: integer 0-100 for how well THIS candidate fits THIS job — weigh skill overlap most heavily, then title and seniority alignment, then location and remote compatibility
- matchReason: one paragraph of 2-4 sentences explaining the score, referencing the candidate's actual skills or experience and the job's stated needs
- matchedSkills: skills from the candidate's profile that this job needs, using the candidate's own wording
- missingSkills: skills the job clearly asks for that the candidate's profile lacks
- Ground everything strictly in the provided data — the description is only a snippet, so never invent requirements beyond it
- If the job is unrelated to the candidate's field, score it low honestly`;
}

function sanitize(raw: unknown): JobMatchContent {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model response is not a JSON object");
  }

  const obj = raw as Record<string, unknown>;

  const matchScore =
    typeof obj.matchScore === "number" && Number.isFinite(obj.matchScore)
      ? Math.min(100, Math.max(0, Math.round(obj.matchScore)))
      : null;
  if (matchScore === null) {
    throw new Error("Model response is missing matchScore");
  }

  const matchReason =
    typeof obj.matchReason === "string" ? obj.matchReason.trim() : "";
  if (!matchReason) {
    throw new Error("Model response is missing matchReason");
  }

  const toStringArray = (value: unknown): string[] =>
    (Array.isArray(value) ? value : [])
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    matchScore,
    matchReason,
    matchedSkills: toStringArray(obj.matchedSkills),
    missingSkills: toStringArray(obj.missingSkills),
  };
}

export async function scoreJobMatch(
  profile: Profile,
  job: UsableAdzunaJob,
): Promise<JobMatchContent> {
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: buildPrompt(profile, job) }] }],
    // Thinking disabled — scoring is structured extraction, and the default
    // thinking budget dominates per-call latency on flash (~15s vs ~3s).
    config: { temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
  });

  const text = (result.text ?? "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in model response");
  }

  const raw = JSON.parse(jsonMatch[0]) as unknown;
  return sanitize(raw);
}
