import type { CompanyResearchDossier } from "@/types";

const MAX_LIST_ITEMS = 8;

function valueFor(
  value: unknown,
  key: keyof CompanyResearchDossier,
): unknown {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return Reflect.get(value, key);
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown, limit: number = MAX_LIST_ITEMS): string[] {
  return (Array.isArray(value) ? value : [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function cleanSources(value: unknown): string[] {
  return cleanList(value, 6).filter((source) => {
    try {
      const url = new URL(source);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  });
}

function stringWithFallback(
  raw: unknown,
  key: keyof CompanyResearchDossier,
  fallback: Partial<CompanyResearchDossier>,
): string {
  return cleanString(valueFor(raw, key)) || cleanString(fallback[key]);
}

function listWithFallback(
  raw: unknown,
  key: keyof CompanyResearchDossier,
  fallback: Partial<CompanyResearchDossier>,
): string[] {
  const cleaned = cleanList(valueFor(raw, key));
  return cleaned.length > 0 ? cleaned : cleanList(fallback[key]);
}

export function sanitizeCompanyResearchDossier(
  raw: unknown,
  fallback: Partial<CompanyResearchDossier> = {},
): CompanyResearchDossier {
  const sources = cleanSources(valueFor(raw, "sources"));
  const fallbackSources = cleanSources(fallback.sources);

  return {
    companyOverview: stringWithFallback(raw, "companyOverview", fallback),
    techStack: listWithFallback(raw, "techStack", fallback),
    culture: listWithFallback(raw, "culture", fallback),
    whyThisRole: stringWithFallback(raw, "whyThisRole", fallback),
    yourEdge: listWithFallback(raw, "yourEdge", fallback),
    gapsToAddress: listWithFallback(raw, "gapsToAddress", fallback),
    smartQuestions: listWithFallback(raw, "smartQuestions", fallback),
    interviewPrep: listWithFallback(raw, "interviewPrep", fallback),
    sources: sources.length > 0 ? sources : fallbackSources,
  };
}

export function hasCompanyResearchContent(
  dossier: CompanyResearchDossier,
): boolean {
  return Boolean(
    dossier.companyOverview ||
      dossier.techStack.length > 0 ||
      dossier.culture.length > 0 ||
      dossier.whyThisRole ||
      dossier.yourEdge.length > 0 ||
      dossier.gapsToAddress.length > 0 ||
      dossier.smartQuestions.length > 0 ||
      dossier.interviewPrep.length > 0,
  );
}

export function parseCompanyResearchDossier(
  raw: unknown,
): CompanyResearchDossier | null {
  const dossier = sanitizeCompanyResearchDossier(raw);
  return hasCompanyResearchContent(dossier) ? dossier : null;
}
