"use client";

import { useActionState, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { saveProfile } from "@/actions/profile";
import type { Profile, WorkExperience } from "@/types";

type Props = {
  profile: Profile;
};

type SaveState = {
  success: boolean;
  error?: string;
};

type Role = WorkExperience & { id: string };

type Option = {
  value: string;
  label: string;
};

const initialState: SaveState = { success: false };

const WORK_AUTHORIZATION_OPTIONS: Option[] = [
  { value: "citizen", label: "Citizen" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "visa_required", label: "Visa Required" },
];

const EXPERIENCE_LEVEL_OPTIONS: Option[] = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

const DEGREE_OPTIONS: Option[] = [
  { value: "high_school", label: "High School" },
  { value: "associate", label: "Associate" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD" },
];

const REMOTE_PREFERENCE_OPTIONS: Option[] = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "Any" },
];

const COVER_LETTER_TONE_OPTIONS: Option[] = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "enthusiastic", label: "Enthusiastic" },
];

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-accent focus:outline-none";

const MAX_ROLES = 3;

function Field({
  label,
  children,
  htmlFor,
  className = "",
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}): ReactElement {
  const labelClass =
    "text-[11px] font-medium uppercase tracking-wide text-text-secondary";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {children}
    </div>
  );
}

function SelectField({
  label,
  name,
  id = name,
  defaultValue,
  options,
  className = "",
}: {
  label: string;
  name: string;
  id?: string;
  defaultValue: string;
  options: Option[];
  className?: string;
}): ReactElement {
  return (
    <Field label={label} htmlFor={id} className={className}>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          className={`${INPUT_CLASS} appearance-none pr-9`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon />
      </div>
    </Field>
  );
}

function ChevronDownIcon(): ReactElement {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SectionHeading({ children }: { children: ReactNode }): ReactElement {
  return (
    <h3 className="text-sm font-semibold leading-5 text-text-primary">
      {children}
    </h3>
  );
}

function RemoveIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TagInput({
  label,
  id,
  placeholder,
  tags,
  value,
  onValueChange,
  onAdd,
  onRemove,
}: {
  label: string;
  id: string;
  placeholder: string;
  tags: string[];
  value: string;
  onValueChange: (next: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}): ReactElement {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      onAdd();
    }
  };

  return (
    <Field label={label} htmlFor={id} className="sm:col-span-2">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className={INPUT_CLASS}
        />
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${label}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-dark"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <ul className="mt-1 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1 text-xs font-medium text-accent"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                aria-label={`Remove ${tag}`}
                className="text-accent transition-opacity hover:opacity-70"
              >
                <RemoveIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

export function ProfileForm({ profile }: Props): ReactElement {
  const [state, formAction, isPending] = useActionState(
    saveProfile,
    initialState,
  );

  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [skillInput, setSkillInput] = useState("");
  const [industries, setIndustries] = useState<string[]>(profile.industries);
  const [industryInput, setIndustryInput] = useState("");
  const [roles, setRoles] = useState<Role[]>(
    profile.workExperience.map((role, index) => ({
      ...role,
      id: `role-${index}`,
    })),
  );
  const nextRoleId = useRef(profile.workExperience.length);

  const addTag = (
    raw: string,
    list: string[],
    setList: (next: string[]) => void,
    clear: () => void,
  ): void => {
    const value = raw.trim();
    if (!value || list.includes(value)) {
      clear();
      return;
    }
    setList([...list, value]);
    clear();
  };

  const addRole = (): void => {
    if (roles.length >= MAX_ROLES) return;
    setRoles((previous) => [
      ...previous,
      {
        id: `role-${nextRoleId.current++}`,
        company: "",
        title: "",
        startDate: "",
        endDate: "",
        currentlyWorking: false,
        responsibilities: "",
      },
    ]);
  };

  const removeRole = (id: string): void => {
    setRoles((previous) => previous.filter((role) => role.id !== id));
  };

  const updateRole = (id: string, patch: Partial<WorkExperience>): void => {
    setRoles((previous) =>
      previous.map((role) => (role.id === id ? { ...role, ...patch } : role)),
    );
  };

  const toggleCurrentlyWorking = (id: string): void => {
    setRoles((previous) =>
      previous.map((role) =>
        role.id === id
          ? { ...role, currentlyWorking: !role.currentlyWorking }
          : role,
      ),
    );
  };

  const workExperienceForSubmit: WorkExperience[] = roles.map((role) => ({
    company: role.company,
    title: role.title,
    startDate: role.startDate,
    endDate: role.endDate,
    currentlyWorking: role.currentlyWorking,
    responsibilities: role.responsibilities,
  }));

  return (
    <section className="rounded-md border border-border bg-surface-elevated p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-6 text-text-primary">
          Profile Information
        </h2>
        <p className="text-sm font-medium leading-5 text-text-secondary">
          This context is used to accurately represent you to agent
          interactions.
        </p>
      </div>

      <form action={formAction}>
        {/* Hidden inputs for dynamic arrays */}
        <input
          type="hidden"
          name="skills"
          value={JSON.stringify(skills)}
        />
        <input
          type="hidden"
          name="industries"
          value={JSON.stringify(industries)}
        />
        <input
          type="hidden"
          name="workExperience"
          value={JSON.stringify(workExperienceForSubmit)}
        />

        <div className="mt-6 flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <SectionHeading>Personal Info</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name" htmlFor="full-name">
                <input
                  id="full-name"
                  type="text"
                  name="full_name"
                  defaultValue={profile.fullName}
                  placeholder="Jane Doe"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Email" htmlFor="profile-email">
                <input
                  id="profile-email"
                  type="email"
                  defaultValue={profile.email}
                  disabled
                  className={`${INPUT_CLASS} disabled:bg-surface-secondary cursor-not-allowed text-text-secondary`}
                />
              </Field>
              <Field label="Phone Number" htmlFor="phone-number">
                <input
                  id="phone-number"
                  type="tel"
                  name="phone"
                  defaultValue={profile.phone}
                  placeholder="+1 (555) 000-0000"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Location" htmlFor="profile-location">
                <input
                  id="profile-location"
                  type="text"
                  name="location"
                  defaultValue={profile.location}
                  placeholder="City, Country"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="LinkedIn URL" htmlFor="linkedin-url">
                <input
                  id="linkedin-url"
                  type="url"
                  name="linkedin_url"
                  defaultValue={profile.linkedinUrl}
                  placeholder="https://linkedin.com/in/username"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Portfolio / GitHub" htmlFor="portfolio-url">
                <input
                  id="portfolio-url"
                  type="url"
                  name="portfolio_url"
                  defaultValue={profile.portfolioUrl}
                  placeholder="https://github.com/username"
                  className={INPUT_CLASS}
                />
              </Field>
              <SelectField
                label="Work Authorization"
                name="work_authorization"
                defaultValue={profile.workAuthorization}
                options={WORK_AUTHORIZATION_OPTIONS}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-8">
            <SectionHeading>Professional Info</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Current / Recent Job Title"
                htmlFor="current-title"
                className="sm:col-span-2"
              >
                <input
                  id="current-title"
                  type="text"
                  name="current_title"
                  defaultValue={profile.currentTitle}
                  placeholder="Frontend Engineer"
                  className={INPUT_CLASS}
                />
              </Field>
              <SelectField
                label="Experience Level"
                name="experience_level"
                defaultValue={profile.experienceLevel}
                options={EXPERIENCE_LEVEL_OPTIONS}
              />
              <Field label="Years of Experience" htmlFor="years-experience">
                <input
                  id="years-experience"
                  type="number"
                  name="years_experience"
                  min="0"
                  defaultValue={profile.yearsExperience}
                  placeholder="0"
                  className={INPUT_CLASS}
                />
              </Field>
              <TagInput
                label="Skills"
                id="skills-input"
                placeholder="Add a skill"
                tags={skills}
                value={skillInput}
                onValueChange={setSkillInput}
                onAdd={() =>
                  addTag(skillInput, skills, setSkills, () => setSkillInput(""))
                }
                onRemove={(tag) =>
                  setSkills((previous) => previous.filter((s) => s !== tag))
                }
              />
              <TagInput
                label="Industries Worked In (Optional)"
                id="industries-input"
                placeholder="E.g. FinTech, Healthcare"
                tags={industries}
                value={industryInput}
                onValueChange={setIndustryInput}
                onAdd={() =>
                  addTag(industryInput, industries, setIndustries, () =>
                    setIndustryInput(""),
                  )
                }
                onRemove={(tag) =>
                  setIndustries((previous) => previous.filter((s) => s !== tag))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-8">
            <div className="flex items-center justify-between">
              <SectionHeading>Work Experience</SectionHeading>
              {roles.length < MAX_ROLES && (
                <button
                  type="button"
                  onClick={addRole}
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-opacity hover:opacity-80"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add role
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {roles.map((role) => {
                const companyId = `company-${role.id}`;
                const titleId = `title-${role.id}`;
                const startDateId = `start-date-${role.id}`;
                const endDateId = `end-date-${role.id}`;
                const currentId = `currently-working-${role.id}`;
                const responsibilitiesId = `responsibilities-${role.id}`;

                return (
                  <div
                    key={role.id}
                    className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Company Name" htmlFor={companyId}>
                        <input
                          id={companyId}
                          type="text"
                          value={role.company}
                          onChange={(e) =>
                            updateRole(role.id, { company: e.target.value })
                          }
                          placeholder="Company"
                          className={INPUT_CLASS}
                        />
                      </Field>
                      <Field label="Job Title" htmlFor={titleId}>
                        <input
                          id={titleId}
                          type="text"
                          value={role.title}
                          onChange={(e) =>
                            updateRole(role.id, { title: e.target.value })
                          }
                          placeholder="Job Title"
                          className={INPUT_CLASS}
                        />
                      </Field>
                      <Field label="Start Date" htmlFor={startDateId}>
                        <input
                          id={startDateId}
                          type="text"
                          value={role.startDate}
                          onChange={(e) =>
                            updateRole(role.id, { startDate: e.target.value })
                          }
                          placeholder="MMMM YYYY"
                          className={INPUT_CLASS}
                        />
                      </Field>
                      <Field label="End Date" htmlFor={endDateId}>
                        <input
                          id={endDateId}
                          type="text"
                          value={role.currentlyWorking ? "" : role.endDate}
                          onChange={(e) =>
                            updateRole(role.id, { endDate: e.target.value })
                          }
                          placeholder="MMMM YYYY"
                          disabled={role.currentlyWorking}
                          className={`${INPUT_CLASS} disabled:bg-surface-secondary`}
                        />
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            id={currentId}
                            type="checkbox"
                            checked={role.currentlyWorking}
                            onChange={() => toggleCurrentlyWorking(role.id)}
                            className="checkbox-accent h-4 w-4"
                          />
                          <label
                            htmlFor={currentId}
                            className="text-xs font-medium text-text-secondary"
                          >
                            Currently working here
                          </label>
                        </div>
                      </Field>
                    </div>
                    <Field
                      label="Key Responsibilities"
                      htmlFor={responsibilitiesId}
                    >
                      <textarea
                        id={responsibilitiesId}
                        value={role.responsibilities}
                        onChange={(e) =>
                          updateRole(role.id, {
                            responsibilities: e.target.value,
                          })
                        }
                        placeholder="What did you work on and achieve in this role?"
                        rows={3}
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </Field>
                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRole(role.id)}
                        className="self-end text-xs font-medium text-text-secondary transition-colors hover:text-accent"
                      >
                        Remove role
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-8">
            <SectionHeading>Education</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Highest Degree"
                name="education_degree"
                defaultValue={profile.education.degree}
                options={DEGREE_OPTIONS}
              />
              <Field label="Field of Study" htmlFor="education-field">
                <input
                  id="education-field"
                  type="text"
                  name="education_field"
                  defaultValue={profile.education.fieldOfStudy}
                  placeholder="Computer Science"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Institution Name" htmlFor="education-institution">
                <input
                  id="education-institution"
                  type="text"
                  name="education_institution"
                  defaultValue={profile.education.institution}
                  placeholder="E.g. State University"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Graduation Year" htmlFor="education-graduation-year">
                <input
                  id="education-graduation-year"
                  type="text"
                  name="education_graduation_year"
                  defaultValue={profile.education.graduationYear}
                  placeholder="YYYY"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-8">
            <SectionHeading>Job Preferences</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Job Titles Seeking"
                htmlFor="job-titles-seeking"
                className="sm:col-span-2"
              >
                <input
                  id="job-titles-seeking"
                  type="text"
                  name="job_titles_seeking"
                  defaultValue={profile.jobTitlesSeeking}
                  placeholder="Frontend Engineer, React Developer"
                  className={INPUT_CLASS}
                />
              </Field>
              <SelectField
                label="Remote Preference"
                name="remote_preference"
                defaultValue={profile.remotePreference}
                options={REMOTE_PREFERENCE_OPTIONS}
              />
              <Field
                label="Salary Expectation (Optional)"
                htmlFor="salary-expectation"
              >
                <input
                  id="salary-expectation"
                  type="text"
                  name="salary_expectation"
                  defaultValue={profile.salaryExpectation}
                  placeholder="E.g. $120,000 - $150,000"
                  className={INPUT_CLASS}
                />
              </Field>
              <SelectField
                label="Cover Letter Tone"
                name="cover_letter_tone"
                defaultValue={profile.coverLetterTone}
                options={COVER_LETTER_TONE_OPTIONS}
              />
              <Field
                label="Preferred Locations (Optional)"
                htmlFor="preferred-locations"
              >
                <input
                  id="preferred-locations"
                  type="text"
                  name="preferred_locations"
                  defaultValue={profile.preferredLocations}
                  placeholder="E.g. New York, London"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>
        </div>

        {state.success && (
          <p className="mt-4 text-sm font-medium text-accent">
            Profile saved successfully.
          </p>
        )}
        {!state.success && state.error && (
          <p className="mt-4 text-sm font-medium text-error">{state.error}</p>
        )}

        <div className="sticky bottom-0 -mx-6 mt-8 border-t border-border bg-surface-elevated px-6 py-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-card transition-colors hover:bg-accent-dark disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
