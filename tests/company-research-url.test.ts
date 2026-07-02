import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackCompanyHomepage,
  getRootDomain,
  homepageFromResolvedUrl,
  isPublicResearchUrl,
  trustedResearchRedirectUrl,
  verifiedCompanyResearchSources,
} from "../lib/company-research-url";

test("trustedResearchRedirectUrl accepts only known Adzuna redirect hosts", () => {
  assert.equal(
    trustedResearchRedirectUrl("https://www.adzuna.com/land/ad/123?se=abc"),
    "https://www.adzuna.com/land/ad/123?se=abc",
  );
  assert.equal(
    trustedResearchRedirectUrl("https://www.adzuna.co.uk/details/456"),
    "https://www.adzuna.co.uk/details/456",
  );

  assert.equal(trustedResearchRedirectUrl("https://example.com/job/123"), null);
  assert.equal(trustedResearchRedirectUrl("http://www.adzuna.com/land/ad/123"), null);
  assert.equal(trustedResearchRedirectUrl("http://localhost:3000/admin"), null);
  assert.equal(
    trustedResearchRedirectUrl("http://169.254.169.254/latest/meta-data"),
    null,
  );
  assert.equal(trustedResearchRedirectUrl("file:///C:/Windows/win.ini"), null);
});

test("homepageFromResolvedUrl strips subdomains and ignores Adzuna or ATS hosts", () => {
  assert.equal(
    homepageFromResolvedUrl("https://jobs.stripe.com/apply/123"),
    "https://stripe.com",
  );
  assert.equal(
    homepageFromResolvedUrl("https://engineering.example.co.uk/jobs/123"),
    "https://example.co.uk",
  );

  assert.equal(homepageFromResolvedUrl("https://www.adzuna.com/details/123"), null);
  assert.equal(homepageFromResolvedUrl("https://boards.greenhouse.io/acme"), null);
  assert.equal(homepageFromResolvedUrl("https://jobs.lever.co/acme/123"), null);
});

test("isPublicResearchUrl rejects loopback, private, and metadata hosts", () => {
  assert.equal(isPublicResearchUrl("https://example.com/careers"), true);
  assert.equal(isPublicResearchUrl("http://localhost:3000/admin"), false);
  assert.equal(isPublicResearchUrl("https://127.0.0.1/admin"), false);
  assert.equal(isPublicResearchUrl("https://10.0.0.10/admin"), false);
  assert.equal(isPublicResearchUrl("https://100.64.0.1/admin"), false);
  assert.equal(isPublicResearchUrl("https://172.16.0.10/admin"), false);
  assert.equal(isPublicResearchUrl("https://192.168.1.1/admin"), false);
  assert.equal(isPublicResearchUrl("https://169.254.169.254/latest"), false);
  assert.equal(isPublicResearchUrl("http://2130706433/admin"), false);
  assert.equal(isPublicResearchUrl("http://0x7f000001/admin"), false);
  assert.equal(isPublicResearchUrl("http://[::1]/admin"), false);
  assert.equal(isPublicResearchUrl("https://[fd00::1]/admin"), false);
  assert.equal(isPublicResearchUrl("file:///C:/Windows/win.ini"), false);
});

test("fallbackCompanyHomepage builds a conservative company-name homepage", () => {
  assert.equal(fallbackCompanyHomepage("Acme, Inc."), "https://www.acme.com");
  assert.equal(
    fallbackCompanyHomepage("Research & Development LLC"),
    "https://www.researchanddevelopment.com",
  );
  assert.equal(fallbackCompanyHomepage(""), null);
});

test("getRootDomain handles common second-level TLDs", () => {
  assert.equal(getRootDomain("jobs.example.com"), "example.com");
  assert.equal(getRootDomain("careers.example.co.uk"), "example.co.uk");
  assert.equal(getRootDomain("www.example.com.au"), "example.com.au");
});

test("verifiedCompanyResearchSources includes only pages used for research", () => {
  assert.deepEqual(
    verifiedCompanyResearchSources({
      homepageUrl: "https://example.com",
      includeHomepage: false,
      subPageUrls: [],
    }),
    [],
  );

  assert.deepEqual(
    verifiedCompanyResearchSources({
      homepageUrl: "https://example.com",
      includeHomepage: true,
      subPageUrls: [
        "https://example.com/about",
        "https://example.com/about",
        "file:///C:/Windows/win.ini",
      ],
    }),
    ["https://example.com", "https://example.com/about"],
  );
});
