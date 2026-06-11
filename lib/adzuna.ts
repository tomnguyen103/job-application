import type { AdzunaJob } from "@/agent/types";

export type AdzunaCountry = "us" | "gb" | "au" | "ca";

const COUNTRY_KEYWORDS: { country: AdzunaCountry; keywords: string[] }[] = [
  {
    country: "gb",
    keywords: [
      "united kingdom",
      "uk",
      "england",
      "scotland",
      "wales",
      "london",
      "manchester",
    ],
  },
  {
    country: "au",
    keywords: ["australia", "sydney", "melbourne", "brisbane", "perth"],
  },
  {
    country: "ca",
    keywords: ["canada", "toronto", "vancouver", "montreal", "ottawa"],
  },
];

export function detectCountry(location: string): AdzunaCountry {
  const normalized = location.toLowerCase();

  for (const { country, keywords } of COUNTRY_KEYWORDS) {
    const matches = keywords.some((keyword) =>
      new RegExp(`\\b${keyword}\\b`).test(normalized),
    );

    if (matches) {
      return country;
    }
  }

  return "us";
}

// Adzuna's redirect_url carries a per-request tracking token (?se=...), so
// the full URL never matches across searches. The canonical form — origin +
// path, which embeds the stable ad id — is what gets stored and deduped on.
export function canonicalSourceUrl(redirectUrl: string): string {
  try {
    const url = new URL(redirectUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return redirectUrl;
  }
}

// Adzuna's `where` parameter is strictly geographic — "Remote" matches no
// location and returns zero results, so remote markers are stripped and the
// parameter is omitted entirely when nothing geographic remains.
function normalizeWhere(location: string): string {
  return location
    .replace(/\bremote\b/gi, "")
    .replace(/\bwork from home\b/gi, "")
    .replace(/\bwfh\b/gi, "")
    .replace(/[.,/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchJobs(
  jobTitle: string,
  location: string,
  country: AdzunaCountry = "us",
): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    throw new Error(
      "Adzuna credentials are not configured (ADZUNA_APP_ID / ADZUNA_APP_KEY).",
    );
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: jobTitle,
    category: "it-jobs",
    results_per_page: "10",
    "content-type": "application/json",
  });

  const where = normalizeWhere(location);
  if (where) {
    params.set("where", where);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  // Boundary assertion on the external API envelope — per-field narrowing
  // happens in the discovery agent before any result is used.
  const data = (await response.json()) as { results?: AdzunaJob[] };

  return data.results ?? [];
}
