const BUCKET = "tailored-resumes";

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

function cleanupRequestToken() {
  return env("TAILORED_RESUME_CLEANUP_API_KEY");
}

function cleanupAdminApiKey() {
  return (
    env("INSFORGE_ADMIN_API_KEY") ||
    env("INSFORGE_API_KEY") ||
    env("API_KEY")
  );
}

function insforgeBaseUrl() {
  return env("INSFORGE_BASE_URL");
}

function constantTimeEqual(left, right) {
  if (!left || !right) {
    return false;
  }

  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let difference = 0;
  for (let i = 0; i < leftBytes.length; i += 1) {
    difference |= leftBytes[i] ^ rightBytes[i];
  }

  return difference === 0;
}

function isAuthorizedCleanupRequest(request, apiKey) {
  const provided = bearerToken(request);
  return constantTimeEqual(provided, apiKey);
}

async function createAdminClientForCleanup({ apiKey, baseUrl }) {
  if (!apiKey || !baseUrl) {
    throw new Error("InsForge cleanup credentials are not configured.");
  }

  const { createAdminClient } = await import("npm:@insforge/sdk");
  return createAdminClient({
    baseUrl,
    apiKey,
  });
}

module.exports = async function cleanupTailoredResumes(request) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const requestToken = cleanupRequestToken();
  const adminApiKey = cleanupAdminApiKey();
  const baseUrl = insforgeBaseUrl();

  if (!requestToken || !adminApiKey || !baseUrl) {
    console.error("[cleanup-tailored-resumes] setup error: missing cleanup configuration");
    return json({ success: false, error: "Cleanup is not configured." }, 500);
  }

  if (!isAuthorizedCleanupRequest(request, requestToken)) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let client;
  try {
    client = await createAdminClientForCleanup({
      apiKey: adminApiKey,
      baseUrl,
    });
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

  if (deletedMetadataIds.length > 0) {
    const { error: deleteError } = await client.database
      .from("tailored_resumes")
      .delete()
      .in("id", deletedMetadataIds);

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
