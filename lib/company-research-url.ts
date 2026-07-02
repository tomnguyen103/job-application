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

function normalizedHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".");

  if (octets.length !== 4) {
    return false;
  }

  const values = octets.map((octet) => Number(octet));
  if (
    values.some(
      (value, index) =>
        !Number.isInteger(value) ||
        value < 0 ||
        value > 255 ||
        String(value) !== octets[index],
    )
  ) {
    return false;
  }

  const [first, second] = values;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(hostname: string): boolean {
  if (!hostname.includes(":")) {
    return false;
  }

  if (hostname === "::" || hostname === "::1") {
    return true;
  }

  if (hostname.startsWith("::ffff:")) {
    return isPrivateIpv4(hostname.slice("::ffff:".length));
  }

  const firstHextet = Number.parseInt(hostname.split(":")[0], 16);
  if (!Number.isFinite(firstHextet)) {
    return false;
  }

  return (
    (firstHextet & 0xfe00) === 0xfc00 ||
    (firstHextet & 0xffc0) === 0xfe80
  );
}

export function isPublicResearchUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    const hostname = normalizedHostname(url.hostname);

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    return !isPrivateIpv4(hostname) && !isPrivateIpv6(hostname);
  } catch {
    return false;
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
