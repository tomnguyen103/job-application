import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import type { GeneratedResumeContent } from "@/agent/generator";
import type { Profile, WorkExperience } from "@/types";

// Print-document palette. The PDF cannot consume the app's CSS variables,
// so neutral ink tones are centralized here instead of ui-tokens.
const COLORS = {
  ink: "#111111",
  body: "#333333",
  muted: "#666666",
};

const DEGREE_LABELS: Record<string, string> = {
  high_school: "High School Diploma",
  associate: "Associate Degree",
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  phd: "PhD",
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: COLORS.body,
    lineHeight: 1.4,
  },
  // Explicit lineHeight: the page-level value inherits as an absolute length
  // computed from the page fontSize, which is far too short for 22pt text.
  name: { fontSize: 22, fontWeight: "bold", color: COLORS.ink, lineHeight: 1.15 },
  title: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  contactLine: { fontSize: 9, color: COLORS.muted, marginTop: 6 },
  section: { marginTop: 14 },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.ink,
    marginBottom: 6,
  },
  bodyText: { fontSize: 9.5, lineHeight: 1.5 },
  roleBlock: { marginTop: 4, marginBottom: 8 },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  roleTitle: { fontSize: 10.5, fontWeight: "bold", color: COLORS.ink },
  roleCompany: { fontSize: 9.5, color: COLORS.muted, marginTop: 1 },
  roleDates: { fontSize: 9, color: COLORS.muted },
  bullet: { fontSize: 9.5, lineHeight: 1.5, marginTop: 3 },
  eduDegree: { fontSize: 10, fontWeight: "bold", color: COLORS.ink },
  eduDetail: { fontSize: 9.5, color: COLORS.body, marginTop: 1 },
});

type Props = {
  profile: Profile;
  content: GeneratedResumeContent;
};

function formatDates(role: WorkExperience): string {
  const end = role.currentlyWorking ? "Present" : role.endDate;
  return [role.startDate, end].filter(Boolean).join(" – ");
}

function ResumeDocument({ profile, content }: Props): ReactElement {
  const contact = [profile.email, profile.phone, profile.location]
    .filter(Boolean)
    .join("   •   ");
  const links = [profile.linkedinUrl, profile.portfolioUrl]
    .filter(Boolean)
    .join("   •   ");

  const { education } = profile;
  const hasEducation = Boolean(education.institution || education.fieldOfStudy);
  const degreeLabel = DEGREE_LABELS[education.degree] ?? education.degree;

  return (
    <Document title={`${profile.fullName} — Resume`} author={profile.fullName}>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{profile.fullName}</Text>
          {profile.currentTitle ? (
            <Text style={styles.title}>{profile.currentTitle}</Text>
          ) : null}
          {contact ? <Text style={styles.contactLine}>{contact}</Text> : null}
          {links ? <Text style={styles.contactLine}>{links}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>PROFESSIONAL SUMMARY</Text>
          <Text style={styles.bodyText}>{content.professionalSummary}</Text>
        </View>

        {profile.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>SKILLS</Text>
            <Text style={styles.bodyText}>{profile.skills.join("  •  ")}</Text>
          </View>
        ) : null}

        {profile.workExperience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>WORK EXPERIENCE</Text>
            {profile.workExperience.map((role, i) => (
              <View key={i} style={styles.roleBlock}>
                <View style={styles.roleHeader}>
                  <View>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleCompany}>{role.company}</Text>
                  </View>
                  <Text style={styles.roleDates}>{formatDates(role)}</Text>
                </View>
                {(content.roles[i]?.bullets ?? []).map((bullet, j) => (
                  <Text key={j} style={styles.bullet}>{`•  ${bullet}`}</Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {hasEducation ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>EDUCATION</Text>
            <Text style={styles.eduDegree}>
              {[degreeLabel, education.fieldOfStudy].filter(Boolean).join(" — ")}
            </Text>
            <Text style={styles.eduDetail}>
              {[education.institution, education.graduationYear]
                .filter(Boolean)
                .join("  •  ")}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

// route.ts is a .ts file and cannot use JSX — it builds the element through here.
// Typed as ReactElement<DocumentProps> to satisfy renderToBuffer's signature.
export function buildResumeDocument(props: Props): ReactElement<DocumentProps> {
  return <ResumeDocument {...props} />;
}
