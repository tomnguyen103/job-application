type PostHogQueryConfig = {
  apiKey: string;
  host: string;
  projectId: string;
};

function getPostHogQueryConfig(): PostHogQueryConfig | null {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const host = process.env.POSTHOG_API_HOST;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !host || !projectId) {
    return null;
  }

  return { apiKey, host, projectId };
}

export type HogQLRow = (string | number | null)[];

// Bounds a hung PostHog endpoint. The force-dynamic dashboard awaits these
// queries during SSR, so without a timeout an unresponsive endpoint would
// block the entire page render — errors degrade per chart, hangs must too.
const QUERY_TIMEOUT_MS = 8000;

/**
 * Runs a HogQL query against the PostHog Query API.
 *
 * Uses the personal API key (query:read scope) — the NEXT_PUBLIC ingestion
 * key cannot query, and the query host (us.posthog.com) differs from the
 * ingestion host (us.i.posthog.com).
 *
 * Returns the result rows, or null on missing config or any request
 * failure — callers degrade to an empty chart state.
 */
export async function queryPostHogHogQL(
  query: string,
  values: Record<string, string | number>,
): Promise<HogQLRow[] | null> {
  const config = getPostHogQueryConfig();

  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[posthog/query] POSTHOG_PERSONAL_API_KEY, POSTHOG_API_HOST or POSTHOG_PROJECT_ID is missing.",
      );
    }
    return null;
  }

  try {
    const response = await fetch(
      `${config.host}/api/projects/${config.projectId}/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          query: { kind: "HogQLQuery", query, values },
        }),
        signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      // PostHog's JSON error body names the cause (e.g. a missing
      // query:read scope) — log a truncated copy, not just the status.
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[posthog/query] query failed with status ${response.status}: ${errorBody.slice(0, 300)}`,
      );
      return null;
    }

    // Boundary assertion on the Query API response shape — `results` is
    // runtime-validated as an array below before it is returned.
    const payload = (await response.json()) as { results?: unknown };

    if (!Array.isArray(payload.results)) {
      console.error("[posthog/query] unexpected response shape");
      return null;
    }

    // Boundary assertion on the row shape — callers defensively coerce
    // each cell (String/Number) in lib/dashboard-charts.ts.
    return payload.results as HogQLRow[];
  } catch (error) {
    console.error("[posthog/query] request error:", error);
    return null;
  }
}
