import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CompletionIndicator } from "../components/profile/CompletionIndicator";
import { computeProfileCompletion } from "../lib/utils";
import type { Profile } from "../types";

function completeProfile(): Profile {
  return {
    fullName: "Abigail Hall",
    email: "abigail@example.com",
    phone: "+1-234-555-1234",
    location: "San Diego, California",
    linkedinUrl: "https://linkedin.com/in/abigail-hall",
    portfolioUrl: "https://github.com/abigailhall",
    workAuthorization: "citizen",
    currentTitle: "Software Engineer",
    experienceLevel: "senior",
    yearsExperience: "7",
    skills: ["Java", "React"],
    industries: ["Healthcare"],
    workExperience: [
      {
        company: "HealthTech Dynamics",
        title: "Software Engineer",
        startDate: "January 2023",
        endDate: "",
        currentlyWorking: true,
        responsibilities: "Built healthcare software",
      },
    ],
    education: {
      degree: "bachelors",
      fieldOfStudy: "Computer Science",
      institution: "University of California, San Diego",
      graduationYear: "2019",
    },
    jobTitlesSeeking: "Software Engineer",
    remotePreference: "any",
    salaryExpectation: "$120,000",
    coverLetterTone: "professional",
    preferredLocations: "San Diego",
  };
}

test("computeProfileCompletion reports 100% and complete when every field is filled", () => {
  const result = computeProfileCompletion(completeProfile());

  assert.equal(result.percentage, 100);
  assert.deepEqual(result.missingFields, []);
  assert.equal(result.isComplete, true);
});

test("computeProfileCompletion reports 92% with Job Titles missing", () => {
  const profile = completeProfile();
  profile.jobTitlesSeeking = "";

  const result = computeProfileCompletion(profile);

  assert.equal(result.percentage, 92);
  assert.deepEqual(result.missingFields, ["Job Titles"]);
  assert.equal(result.isComplete, false);
});

test("CompletionIndicator renders nothing for a complete profile", () => {
  const rendered = renderToStaticMarkup(
    createElement(CompletionIndicator, { percentage: 100, missingFields: [] }),
  );

  assert.equal(rendered, "");
});

test("CompletionIndicator renders the card while fields are missing", () => {
  const rendered = renderToStaticMarkup(
    createElement(CompletionIndicator, {
      percentage: 92,
      missingFields: ["Job Titles"],
    }),
  );

  assert.match(rendered, /Profile needs attention/);
  assert.match(rendered, /Job Titles/);
});
