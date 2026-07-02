import { collectBrowserResearch } from "@/agent/research-browser-collection";
import {
  buildFallbackDossier,
  emptyBrowserResearch,
} from "@/agent/research-fallback";
import { synthesizeDossier } from "@/agent/research-synthesis-prompt";
import type { CompanyResearchDossier } from "@/types";
import type {
  CompanyResearchJob,
  InsforgeServer,
  LogLevel,
  ResearchCompanyArgs,
} from "./research-types";

export type { CompanyResearchJob };

async function logResearchEvent(
  insforge: InsforgeServer,
  entry: {
    userId: string;
    jobId: string;
    message: string;
    level: LogLevel;
  },
): Promise<void> {
  const { error } = await insforge.database.from("agent_logs").insert([
    {
      run_id: null,
      user_id: entry.userId,
      job_id: entry.jobId,
      message: entry.message,
      level: entry.level,
    },
  ]);

  if (error) {
    console.error("[agent/research] failed to write agent log:", error);
  }
}

export async function researchCompany(
  args: ResearchCompanyArgs,
): Promise<{ success: true; dossier: CompanyResearchDossier }> {
  const writeLog = (entry: Parameters<typeof logResearchEvent>[1]) =>
    logResearchEvent(args.insforge, entry);

  try {
    await writeLog({
      userId: args.userId,
      jobId: args.job.id,
      level: "info",
      message: `Researching ${args.job.company} for "${args.job.title}".`,
    });

    const browserResearch = await collectBrowserResearch(args, writeLog);
    const dossier = await synthesizeDossier(args, browserResearch, writeLog);

    await writeLog({
      userId: args.userId,
      jobId: args.job.id,
      level: "success",
      message: `Company research saved for ${args.job.company}.`,
    });

    return { success: true, dossier };
  } catch (error) {
    console.error("[agent/research]", error);
    await writeLog({
      userId: args.userId,
      jobId: args.job.id,
      level: "error",
      message:
        "Company research failed unexpectedly; saved a conservative dossier.",
    });

    return {
      success: true,
      dossier: buildFallbackDossier(
        args.job,
        args.profile,
        emptyBrowserResearch(),
      ),
    };
  }
}
