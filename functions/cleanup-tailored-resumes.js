const BUCKET = "tailored-resumes";
const DEFAULT_BASE_URL = "https://wgg8j33p.us-east.insforge.app";

function env(name) {
  if (typeof Deno !== "undefined") {
    return Deno.env.get(name);
  }

  if (typeof process !== "undefined") {
    return process.env[name];
  }

  return undefined;
}

function bearerToken(request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ")
    ? header.slice("bearer ".length).trim()
    : "";
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cleanupApiKey() {
  return (
    env("TAILORED_RESUME_CLEANUP_API_KEY") ||
    env("INSFORGE_API_KEY") ||
    env("INSFORGE_ADMIN_API_KEY") ||
    env("API_KEY")
  );
}

function isAuthorizedCleanupRequest(request, apiKey) {
  const provided = bearerToken(request);
  return Boolean(apiKey && provided && provided === apiKey);
}

async function createAdminClientForCleanup(apiKey) {
  if (!apiKey) {
    throw new Error("INSFORGE_API_KEY is not configured.");
  }

  const { createAdminClient } = await import("npm:@insforge/sdk");
  return createAdminClient({
    baseUrl: env("INSFORGE_BASE_URL") || DEFAULT_BASE_URL,
    apiKey,
  });
}

module.exports = async function cleanupTailoredResumes(request) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const apiKey = cleanupApiKey();
  if (!apiKey) {
    console.error("[cleanup-tailored-resumes] setup error: missing API key");
    return json({ success: false, error: "Cleanup is not configured." }, 500);
  }

  if (!isAuthorizedCleanupRequest(request, apiKey)) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let client;
  try {
    client = await createAdminClientForCleanup(apiKey);
  } catch (error) {
    console.error("[cleanup-tailored-resumes] setup error:", error);
    return json({ success: false, error: "Cleanup is not configured." }, 500);
  }

  const now = new Date().toISOString();
  const { data: rows, error: readError } = await client.database
    .from("tailored_resumes")
    .select("id, storage_key")
    .lte("expires_at", now);

  if (readError) {
    console.error("[cleanup-tailored-resumes] read error:", readError);
    return json({ success: false, error: "Failed to read expired resumes." }, 500);
  }

  const expired = rows ?? [];
  const bucket = client.storage.from(BUCKET);
  let deletedFiles = 0;
  let fileWarnings = 0;
  const deletedMetadataIds = [];

  for (const row of expired) {
    if (!row.storage_key) {
      fileWarnings += 1;
      continue;
    }

    const { error: removeError } = await bucket.remove(row.storage_key);
    if (removeError) {
      fileWarnings += 1;
      console.warn(
        "[cleanup-tailored-resumes] storage delete warning:",
        removeError,
      );
    } else {
      deletedFiles += 1;
      if (row.id) {
        deletedMetadataIds.push(row.id);
      }
    }
  }

  const ids = deletedMetadataIds;
  if (ids.length > 0) {
    const { error: deleteError } = await client.database
      .from("tailored_resumes")
      .delete()
      .in("id", ids);

    if (deleteError) {
      console.error("[cleanup-tailored-resumes] metadata delete error:", deleteError);
      return json(
        { success: false, error: "Failed to delete expired resume metadata." },
        500,
      );
    }
  }

  return json({
    success: true,
    data: {
      expiredRows: expired.length,
      deletedFiles,
      fileWarnings,
    },
  });
};
