const ATS_ROOT_DOMAINS = new Set([
  "ashbyhq.com",
  "greenhouse.io",
  "icims.com",
  "lever.co",
  "myworkdayjobs.com",
  "workdayjobs.com",
]);

const SECOND_LEVEL_TLDS = new Set([
  "ac.uk",
  "co.in",
  "co.jp",
  "co.nz",
  "co.uk",
  "co.za",
  "com.au",
  "com.br",
  "com.cn",
  "com.sg",
  "org.uk",
]);

const TRUSTED_JOB_REDIRECT_ROOT_DOMAINS = new Set([
  "adzuna.ca",
  "adzuna.co.uk",
  "adzuna.com",
  "adzuna.com.au",
]);

export function getRootDomain(hostname: string): string {
  const parts = hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".")
    .filter(Boolean);

  if (parts.length <= 2) {
    return parts.join(".");
  }

  const lastTwo = parts.slice(-2).join(".");
  if (SECOND_LEVEL_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return lastTwo;
}

export function homepageFromResolvedUrl(resolvedUrl: string): string | null {
  try {
    const url = new URL(resolvedUrl);
    const rootDomain = getRootDomain(url.hostname);

    if (!rootDomain || rootDomain.includes("adzuna.")) {
      return null;
    }

    if (ATS_ROOT_DOMAINS.has(rootDomain)) {
      return null;
    }

    return `https://${rootDomain}`;
  } catch {
    return null;
  }
}

export function fallbackCompanyHomepage(company: string): string | null {
  const withoutSuffix = company
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(
      /\s*,?\s+(incorporated|inc\.?|llc|ltd\.?|limited|corp\.?|corporation|co\.?|company)\s*$/i,
      "",
    )
    .trim();

  const slug = withoutSuffix
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

  return slug ? `https://www.${slug}.com` : null;
}

export function trustedResearchRedirectUrl(
  postUrl: string | null | undefined,
): string | null {
  if (!postUrl) {
    return null;
  }

  try {
    const url = new URL(postUrl);

    if (url.protocol !== "https:") {
      return null;
    }

    const rootDomain = getRootDomain(url.hostname);
    return TRUSTED_JOB_REDIRECT_ROOT_DOMAINS.has(rootDomain)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function cleanHttpUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function verifiedCompanyResearchSources({
  homepageUrl,
  includeHomepage,
  subPageUrls,
}: {
  homepageUrl: string | null;
  includeHomepage: boolean;
  subPageUrls: string[];
}): string[] {
  const sources: string[] = [];
  const seen = new Set<string>();

  for (const source of [
    includeHomepage ? homepageUrl : null,
    ...subPageUrls,
  ]) {
    const cleaned = cleanHttpUrl(source);

    if (!cleaned || seen.has(cleaned)) {
      continue;
    }

    seen.add(cleaned);
    sources.push(cleaned);
  }

  return sources;
}
