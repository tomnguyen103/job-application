import type { Profile, ProfileRow } from "@/types";

export const MATCH_THRESHOLD = 70;

export function mapProfileRowToProfile(
  row: ProfileRow,
  fallbackEmail: string,
): Profile {
  return {
    fullName: row.full_name ?? "",
    email: row.email ?? fallbackEmail,
    phone: row.phone ?? "",
    location: row.location ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    portfolioUrl: row.portfolio_url ?? "",
    // Missing select-style fields map to "" (not a plausible default) so
    // computeProfileCompletion reports them as missing — mirroring how
    // saveProfile snapshots unset values before computing is_complete.
    workAuthorization: row.work_authorization ?? "",
    currentTitle: row.current_title ?? "",
    experienceLevel: row.experience_level ?? "",
    yearsExperience:
      row.years_experience !== null && row.years_experience !== undefined
        ? String(row.years_experience)
        : "",
    skills: row.skills ?? [],
    industries: row.industries ?? [],
    workExperience: row.work_experience ?? [],
    education: row.education ?? {
      degree: "",
      fieldOfStudy: "",
      institution: "",
      graduationYear: "",
    },
    jobTitlesSeeking: (row.job_titles_seeking ?? []).join(", "),
    remotePreference: row.remote_preference ?? "",
    salaryExpectation: row.salary_expectation ?? "",
    preferredLocations: (row.preferred_locations ?? []).join(", "),
  };
}

export function computeProfileCompletion(profile: Profile): {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
} {
  const checks: { field: string; filled: boolean }[] = [
    { field: "Full Name", filled: !!profile.fullName?.trim() },
    { field: "Phone", filled: !!profile.phone?.trim() },
    { field: "Location", filled: !!profile.location?.trim() },
    { field: "Current Title", filled: !!profile.currentTitle?.trim() },
    { field: "Experience Level", filled: !!profile.experienceLevel },
    {
      field: "Years Experience",
      filled: profile.yearsExperience !== "",
    },
    { field: "Skills", filled: profile.skills.length > 0 },
    { field: "Work Experience", filled: profile.workExperience.length > 0 },
    {
      field: "Education",
      filled:
        !!profile.education.degree &&
        !!profile.education.institution?.trim() &&
        !!profile.education.graduationYear?.trim(),
    },
    { field: "Job Titles", filled: !!profile.jobTitlesSeeking?.trim() },
    { field: "Remote Preference", filled: !!profile.remotePreference },
    { field: "Work Authorization", filled: !!profile.workAuthorization },
  ];

  const missingFields = checks.filter((c) => !c.filled).map((c) => c.field);
  const filled = checks.length - missingFields.length;
  const percentage = Math.round((filled / checks.length) * 100);
  const isComplete = missingFields.length === 0;

  return { percentage, missingFields, isComplete };
}

export function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const minutes = Math.floor((Date.now() - timestamp) / 60_000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
