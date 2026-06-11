const MAX_TECH_STACK_ITEMS = 8;

type TechTerm = {
  label: string;
  aliases: string[];
};

const TECH_TERMS: TechTerm[] = [
  { label: "JavaScript", aliases: ["JavaScript", "JS"] },
  { label: "TypeScript", aliases: ["TypeScript", "TS"] },
  { label: "React", aliases: ["React", "React.js", "ReactJS"] },
  { label: "Next.js", aliases: ["Next.js", "NextJS"] },
  { label: "Node.js", aliases: ["Node.js", "NodeJS"] },
  { label: "Python", aliases: ["Python"] },
  { label: "Django", aliases: ["Django"] },
  { label: "FastAPI", aliases: ["FastAPI"] },
  { label: "Java", aliases: ["Java"] },
  { label: "Spring", aliases: ["Spring", "Spring Boot"] },
  { label: "C#", aliases: ["C#"] },
  { label: ".NET", aliases: [".NET", "dotnet"] },
  { label: "Go", aliases: ["Go", "Golang"] },
  { label: "Ruby", aliases: ["Ruby"] },
  { label: "Rails", aliases: ["Rails", "Ruby on Rails"] },
  { label: "PHP", aliases: ["PHP"] },
  { label: "Laravel", aliases: ["Laravel"] },
  { label: "AWS", aliases: ["AWS", "Amazon Web Services"] },
  { label: "Azure", aliases: ["Azure", "Microsoft Azure"] },
  {
    label: "Google Cloud Platform",
    aliases: ["Google Cloud Platform", "Google Cloud", "GCP"],
  },
  { label: "Cloudflare", aliases: ["Cloudflare", "Cloudflare Workers"] },
  { label: "Terraform", aliases: ["Terraform"] },
  { label: "Kubernetes", aliases: ["Kubernetes", "K8s"] },
  { label: "Docker", aliases: ["Docker"] },
  { label: "PostgreSQL", aliases: ["PostgreSQL", "Postgres"] },
  { label: "MySQL", aliases: ["MySQL"] },
  { label: "MongoDB", aliases: ["MongoDB"] },
  { label: "Redis", aliases: ["Redis"] },
  { label: "GraphQL", aliases: ["GraphQL"] },
  { label: "REST", aliases: ["REST", "REST API", "REST APIs"] },
  { label: "Kafka", aliases: ["Kafka", "Apache Kafka"] },
  { label: "Snowflake", aliases: ["Snowflake"] },
  { label: "Databricks", aliases: ["Databricks"] },
  { label: "Spark", aliases: ["Spark", "Apache Spark"] },
  { label: "dbt", aliases: ["dbt"] },
  { label: "Tableau", aliases: ["Tableau"] },
  { label: "Power BI", aliases: ["Power BI", "PowerBI"] },
  { label: "Salesforce", aliases: ["Salesforce"] },
  { label: "Workday", aliases: ["Workday"] },
  { label: "OpenAI", aliases: ["OpenAI"] },
  { label: "Gemini", aliases: ["Gemini"] },
];

export type CompanyTechEvidence = {
  researchTechnologies: string[];
  jobDescription: string;
};

function cleanTechTerm(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTechKey(value: string): string {
  return cleanTechTerm(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function descriptionMentions(description: string, alias: string): boolean {
  const escapedAlias = escapeRegExp(alias).replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(^|[^a-z0-9])${escapedAlias}([^a-z0-9]|$)`, "i");
  return pattern.test(description);
}

function canonicalTechLabel(value: string): string {
  const normalized = normalizeTechKey(value);

  for (const term of TECH_TERMS) {
    if (
      normalizeTechKey(term.label) === normalized ||
      term.aliases.some((alias) => normalizeTechKey(alias) === normalized)
    ) {
      return term.label;
    }
  }

  return cleanTechTerm(value);
}

function uniqueTechTerms(values: string[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const value of values) {
    const clean = cleanTechTerm(value);
    if (!clean) {
      continue;
    }

    const label = canonicalTechLabel(clean);
    const key = normalizeTechKey(label);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    terms.push(label);
  }

  return terms.slice(0, MAX_TECH_STACK_ITEMS);
}

function jobDescriptionTechnologies(description: string): string[] {
  return TECH_TERMS.filter((term) =>
    term.aliases.some((alias) => descriptionMentions(description, alias)),
  ).map((term) => term.label);
}

export function deriveCompanyTechStack(
  evidence: CompanyTechEvidence,
): string[] {
  return uniqueTechTerms([
    ...evidence.researchTechnologies,
    ...jobDescriptionTechnologies(evidence.jobDescription),
  ]);
}

export function filterCompanyTechStackToEvidence(
  techStack: string[],
  evidence: CompanyTechEvidence,
): string[] {
  const evidenceTechStack = deriveCompanyTechStack(evidence);

  if (evidenceTechStack.length === 0) {
    return [];
  }

  const allowedKeys = new Set(evidenceTechStack.map(normalizeTechKey));
  const filtered = uniqueTechTerms(techStack).filter((item) =>
    allowedKeys.has(normalizeTechKey(item)),
  );

  return filtered.length > 0 ? filtered : evidenceTechStack;
}
