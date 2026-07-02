"use server";

import { revalidatePath } from "next/cache";

import { capturePostHogServerEvent } from "@/lib/posthog-server";
import { createInsforgeServer, requireCurrentUser } from "@/lib/insforge-server";
import {
  buildResumeStorageKey,
  PROFILE_RESUME_BUCKET,
  replaceResumeReferenceIfCurrent,
  resolveResumeStorageKey,
} from "@/lib/resume-storage";
import { removeExistingResumeFile } from "@/lib/storage-errors";
import { computeProfileCompletion } from "@/lib/utils";
import type { WorkExperience, Education } from "@/types";

type SaveProfileState = {
  success: boolean;
  error?: string;
};

type SaveResumeState = {
  success: boolean;
  error?: string;
  fileName?: string;
};

const VALID_EXPERIENCE_LEVELS = new Set(["junior", "mid", "senior", "lead"]);
const VALID_REMOTE_PREFERENCES = new Set(["remote", "onsite", "hybrid", "any"]);
const VALID_COVER_LETTER_TONES = new Set([
  "formal",
  "casual",
  "enthusiastic",
]);
const VALID_WORK_AUTHORIZATIONS = new Set([
  "citizen",
  "permanent_resident",
  "visa_required",
]);

function parseJsonArray<T>(raw: FormDataEntryValue | null): T[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function splitToArray(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveProfile(
  _prevState: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  // Outside try/catch — redirect() from requireCurrentUser throws NEXT_REDIRECT,
  // which must not be caught or it won't execute.
  const user = await requireCurrentUser();
  try {
    const insforge = await createInsforgeServer();

    // FormData text inputs always yield string | null, never File — assertions below are safe.
    const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
    const phone = (formData.get("phone") as string | null)?.trim() ?? "";
    const location = (formData.get("location") as string | null)?.trim() ?? "";
    const linkedinUrl =
      (formData.get("linkedin_url") as string | null)?.trim() ?? "";
    const portfolioUrl =
      (formData.get("portfolio_url") as string | null)?.trim() ?? "";
    const currentTitle =
      (formData.get("current_title") as string | null)?.trim() ?? "";
    const salaryExpectation =
      (formData.get("salary_expectation") as string | null)?.trim() ?? "";

    // Absent/empty selects store null; a non-empty value outside the allowed
    // set only happens via client tampering — reject it instead of silently
    // coercing to null.
    const rawExperienceLevel = formData.get("experience_level") as
      | string
      | null;
    if (rawExperienceLevel && !VALID_EXPERIENCE_LEVELS.has(rawExperienceLevel)) {
      return { success: false, error: "Invalid experience level." };
    }
    const experienceLevel = rawExperienceLevel || null;

    const rawRemotePreference = formData.get("remote_preference") as
      | string
      | null;
    if (rawRemotePreference && !VALID_REMOTE_PREFERENCES.has(rawRemotePreference)) {
      return { success: false, error: "Invalid remote preference." };
    }
    const remotePreference = rawRemotePreference || null;

    const rawWorkAuthorization = formData.get("work_authorization") as
      | string
      | null;
    if (
      rawWorkAuthorization &&
      !VALID_WORK_AUTHORIZATIONS.has(rawWorkAuthorization)
    ) {
      return { success: false, error: "Invalid work authorization." };
    }
    const workAuthorization = rawWorkAuthorization || null;

    const rawCoverLetterTone = formData.get("cover_letter_tone") as
      | string
      | null;
    if (rawCoverLetterTone && !VALID_COVER_LETTER_TONES.has(rawCoverLetterTone)) {
      return { success: false, error: "Invalid cover letter tone." };
    }
    const coverLetterTone = rawCoverLetterTone || null;

    const rawYearsExperience = formData.get("years_experience");
    // FormData text inputs always yield string | null; never File.
    const parsedYears =
      rawYearsExperience !== null && rawYearsExperience !== ""
        ? parseInt(rawYearsExperience as string, 10)
        : NaN;
    const yearsExperience = isNaN(parsedYears) ? null : parsedYears;

    const jobTitlesSeeking = splitToArray(formData.get("job_titles_seeking"));
    const preferredLocations = splitToArray(
      formData.get("preferred_locations"),
    );

    const skills = parseJsonArray<string>(formData.get("skills"));
    const industries = parseJsonArray<string>(formData.get("industries"));
    const rawRoles = parseJsonArray<WorkExperience>(
      formData.get("workExperience"),
    );

    const workExperience = rawRoles.map((role) => ({
      company: role.company,
      title: role.title,
      startDate: role.startDate,
      endDate: role.currentlyWorking ? "" : role.endDate,
      currentlyWorking: role.currentlyWorking,
      responsibilities: role.responsibilities,
    }));

    const education: Education = {
      degree: (formData.get("education_degree") as string | null) ?? "",
      fieldOfStudy:
        (formData.get("education_field") as string | null)?.trim() ?? "",
      institution:
        (formData.get("education_institution") as string | null)?.trim() ?? "",
      graduationYear:
        (formData.get("education_graduation_year") as string | null)?.trim() ??
        "",
    };

    const { data: existingRow } = await insforge.database
      .from("profiles")
      .select("is_complete")
      .eq("id", user.id)
      .maybeSingle();

    const prevIsComplete = existingRow?.is_complete === true;

    const profileSnapshot = {
      fullName,
      phone,
      location,
      email: user.email ?? "",
      linkedinUrl,
      portfolioUrl,
      workAuthorization: workAuthorization ?? "",
      currentTitle,
      experienceLevel: experienceLevel ?? "",
      yearsExperience: yearsExperience?.toString() ?? "",
      skills,
      industries,
      workExperience,
      education,
      jobTitlesSeeking: jobTitlesSeeking.join(", "),
      remotePreference: remotePreference ?? "",
      salaryExpectation,
      coverLetterTone: coverLetterTone ?? "",
      preferredLocations: preferredLocations.join(", "),
    };

    const { isComplete } = computeProfileCompletion(profileSnapshot);

    const { error } = await insforge.database
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: fullName,
          phone,
          location,
          linkedin_url: linkedinUrl,
          portfolio_url: portfolioUrl,
          current_title: currentTitle,
          experience_level: experienceLevel,
          years_experience: yearsExperience,
          skills,
          industries,
          work_experience: workExperience,
          education,
          job_titles_seeking: jobTitlesSeeking,
          remote_preference: remotePreference,
          preferred_locations: preferredLocations,
          salary_expectation: salaryExpectation,
          cover_letter_tone: coverLetterTone,
          work_authorization: workAuthorization,
          is_complete: isComplete,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select()
      .single();

    if (error) {
      console.error("[actions/profile] saveProfile DB error:", error);
      return { success: false, error: "Failed to save profile. Please try again." };
    }

    if (!prevIsComplete && isComplete) {
      await capturePostHogServerEvent("profile_completed", { userId: user.id });
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[actions/profile] saveProfile error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function saveResume(
  _prevState: SaveResumeState,
  formData: FormData,
): Promise<SaveResumeState> {
  // Outside try/catch — same reason as saveProfile above.
  const user = await requireCurrentUser();
  try {
    const insforge = await createInsforgeServer();

    const file = formData.get("resume") as File | null;

    if (!file) {
      return { success: false, error: "No file provided." };
    }

    if (file.type !== "application/pdf") {
      return {
        success: false,
        error: "Only PDF files are accepted.",
      };
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return {
        success: false,
        error: "File must be 5 MB or smaller.",
      };
    }

    const { data: existingProfile, error: existingProfileError } =
      await insforge.database
        .from("profiles")
        .select("resume_pdf_key, resume_pdf_url")
        .eq("id", user.id)
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        "[actions/profile] saveResume existing profile read error:",
        existingProfileError,
      );
      return { success: false, error: "Failed to prepare resume upload. Please try again." };
    }

    const previousPath = existingProfile?.resume_pdf_url
      ? resolveResumeStorageKey(user.id, existingProfile.resume_pdf_key)
      : null;
    const path = buildResumeStorageKey(user.id);

    const { data: uploadData, error: uploadError } = await insforge.storage
      .from(PROFILE_RESUME_BUCKET)
      .upload(path, file);

    if (uploadError) {
      console.error("[actions/profile] saveResume upload error:", uploadError);
      return { success: false, error: "Failed to upload resume. Please try again." };
    }

    const uploadedPath = uploadData?.key ?? path;
    const url = insforge.storage.from(PROFILE_RESUME_BUCKET).getPublicUrl(uploadedPath);

    const saveResult = await replaceResumeReferenceIfCurrent(insforge, {
      userId: user.id,
      profileExists: Boolean(existingProfile),
      currentResumePdfKey: existingProfile?.resume_pdf_key,
      nextResumePdfKey: uploadedPath,
      nextResumePdfUrl: url,
    });

    if (saveResult.status === "error") {
      console.error("[actions/profile] saveResume DB error:", saveResult.error);
      await removeExistingResumeFile(
        insforge,
        uploadedPath,
        "[actions/profile] saveResume uploaded file cleanup",
      );
      return { success: false, error: "Failed to save resume. Please try again." };
    }

    if (saveResult.status === "stale") {
      await removeExistingResumeFile(
        insforge,
        uploadedPath,
        "[actions/profile] saveResume stale upload cleanup",
      );
      return {
        success: false,
        error: "Your resume changed while saving. Please try again.",
      };
    }

    if (previousPath && previousPath !== uploadedPath) {
      await removeExistingResumeFile(
        insforge,
        previousPath,
        "[actions/profile] saveResume previous file cleanup",
      );
    }

    revalidatePath("/profile");
    return { success: true, fileName: file.name };
  } catch (error) {
    console.error("[actions/profile] saveResume error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
