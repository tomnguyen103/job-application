import assert from "node:assert/strict";
import { test } from "node:test";

import {
  sanitizeExtractedProfile,
  type RawExtracted,
} from "../agent/extractor";

test("sanitizeExtractedProfile keeps real profile URLs and normalizes the scheme", () => {
  const raw: RawExtracted = {
    linkedinUrl: "linkedin.com/in/abigail-hall",
    portfolioUrl: "https://github.com/abigailhall",
  };

  const result = sanitizeExtractedProfile(raw);

  assert.equal(result.linkedinUrl, "https://linkedin.com/in/abigail-hall");
  assert.equal(result.portfolioUrl, "https://github.com/abigailhall");
});

test("sanitizeExtractedProfile drops bare placeholder links from resume templates", () => {
  const raw: RawExtracted = {
    linkedinUrl: "linkedin.com",
    portfolioUrl: "https://github.com",
  };

  const result = sanitizeExtractedProfile(raw);

  assert.equal(result.linkedinUrl, undefined);
  assert.equal(result.portfolioUrl, undefined);
});

test("sanitizeExtractedProfile upgrades http:// profile URLs to https://", () => {
  const result = sanitizeExtractedProfile({
    linkedinUrl: "http://linkedin.com/in/abigail-hall",
  });

  assert.equal(result.linkedinUrl, "https://linkedin.com/in/abigail-hall");
});

test("sanitizeExtractedProfile drops non-URL junk like a literal Email label", () => {
  const result = sanitizeExtractedProfile({ portfolioUrl: "Email" });

  assert.equal(result.portfolioUrl, undefined);
});

test("sanitizeExtractedProfile marks a Present end date as currently working", () => {
  const raw: RawExtracted = {
    workExperience: [
      {
        company: "HealthTech Dynamics",
        title: "Software Engineer",
        startDate: "January 2023",
        endDate: "Present",
        currentlyWorking: false,
        responsibilities: "Built healthcare software",
      },
      {
        company: "Innovative Solutions",
        title: "Full Stack Developer",
        startDate: "May 2019",
        endDate: "December 2022",
        currentlyWorking: false,
        responsibilities: "Built web apps",
      },
    ],
  };

  const result = sanitizeExtractedProfile(raw);

  assert.equal(result.workExperience?.[0].currentlyWorking, true);
  assert.equal(result.workExperience?.[0].endDate, "");
  assert.equal(result.workExperience?.[1].currentlyWorking, false);
  assert.equal(result.workExperience?.[1].endDate, "December 2022");
});

test("sanitizeExtractedProfile coerces a string \"true\" currentlyWorking flag", () => {
  const result = sanitizeExtractedProfile({
    workExperience: [
      {
        company: "HealthTech Dynamics",
        title: "Software Engineer",
        startDate: "January 2023",
        endDate: "",
        currentlyWorking: "true",
        responsibilities: "Built healthcare software",
      },
    ],
  });

  assert.equal(result.workExperience?.[0].currentlyWorking, true);
  assert.equal(result.workExperience?.[0].endDate, "");
});

test("sanitizeExtractedProfile accepts enum values regardless of casing", () => {
  const raw: RawExtracted = {
    experienceLevel: "Senior",
    education: {
      degree: "Bachelors",
      fieldOfStudy: "Computer Science",
      institution: "University of California, San Diego",
      graduationYear: 2019,
    },
  };

  const result = sanitizeExtractedProfile(raw);

  assert.equal(result.experienceLevel, "senior");
  assert.equal(result.education?.degree, "bachelors");
  assert.equal(result.education?.graduationYear, "2019");
});

test("sanitizeExtractedProfile rounds yearsExperience and rejects non-numbers", () => {
  assert.equal(
    sanitizeExtractedProfile({ yearsExperience: "7.4" }).yearsExperience,
    "7",
  );
  assert.equal(
    sanitizeExtractedProfile({ yearsExperience: 7 }).yearsExperience,
    "7",
  );
  assert.equal(
    sanitizeExtractedProfile({ yearsExperience: "about seven" })
      .yearsExperience,
    undefined,
  );
  assert.equal(
    sanitizeExtractedProfile({ yearsExperience: "" }).yearsExperience,
    undefined,
  );
});

test("sanitizeExtractedProfile drops nulls and empty values entirely", () => {
  const result = sanitizeExtractedProfile({
    fullName: "Abigail Hall",
    phone: null,
    location: "  ",
    skills: [],
    workExperience: [],
    education: null,
  });

  assert.deepEqual(result, { fullName: "Abigail Hall" });
});
