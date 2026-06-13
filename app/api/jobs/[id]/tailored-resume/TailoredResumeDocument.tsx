import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import {
  targetRoleLabel,
  type TailoredResumeContent,
  type TailoredResumeJob,
} from "@/agent/tailored-resume";
import type { Profile, WorkExperience } from "@/types";

// Print-document palette. React PDF cannot consume app CSS variables.
const COLORS = {
  ink: "black",
  body: "dimgray",
  muted: "gray",
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
    lineHeight: 1.45,
  },
  name: {
    fontSize: 21,
    fontWeight: "bold",
    color: COLORS.ink,
    lineHeight: 1.15,
  },
  title: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  targetRole: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: COLORS.ink,
    marginTop: 7,
  },
  contactLine: { fontSize: 9, color: COLORS.muted, marginTop: 6 },
  section: { marginTop: 13 },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.ink,
    marginBottom: 5,
  },
  bodyText: { fontSize: 9.5, lineHeight: 1.45 },
  roleBlock: { marginTop: 4, marginBottom: 8 },
  roleTitle: { fontSize: 10.5, fontWeight: "bold", color: COLORS.ink },
  roleCompany: { fontSize: 9.5, color: COLORS.muted, marginTop: 1 },
  bullet: { fontSize: 9.5, lineHeight: 1.45, marginTop: 3 },
  eduDegree: { fontSize: 10, fontWeight: "bold", color: COLORS.ink },
  eduDetail: { fontSize: 9.5, color: COLORS.body, marginTop: 1 },
});

type Props = {
  profile: Profile;
  content: TailoredResumeContent;
  job: TailoredResumeJob;
};

function formatDates(role: WorkExperience): string {
  const end = role.currentlyWorking ? "Present" : role.endDate;
  return [role.startDate, end].filter(Boolean).join(" - ");
}

function TailoredResumeDocument({ profile, content, job }: Props): ReactElement {
  const contact = [profile.email, profile.phone, profile.location]
    .filter(Boolean)
    .join(" | ");
  const links = [profile.linkedinUrl, profile.portfolioUrl]
    .filter(Boolean)
    .join(" | ");
  const targetRole = targetRoleLabel(job);
  const { education } = profile;
  const hasEducation = Boolean(education.institution || education.fieldOfStudy);
  const degreeLabel = DEGREE_LABELS[education.degree] ?? education.degree;

  return (
    <Document
      title={`${profile.fullName} - Tailored Resume - ${job.title}`}
      author={profile.fullName}
    >
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{profile.fullName}</Text>
          {profile.currentTitle ? (
            <Text style={styles.title}>{profile.currentTitle}</Text>
          ) : null}
          {targetRole ? (
            <Text style={styles.targetRole}>{`Target Role: ${targetRole}`}</Text>
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
            <Text style={styles.bodyText}>{profile.skills.join(" | ")}</Text>
          </View>
        ) : null}

        {profile.workExperience.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>WORK EXPERIENCE</Text>
            {profile.workExperience.map((role, i) => (
              <View key={i} style={styles.roleBlock}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleCompany}>
                  {[role.company, formatDates(role)].filter(Boolean).join(" | ")}
                </Text>
                {(content.roles[i]?.bullets ?? []).map((bullet, j) => (
                  <Text key={j} style={styles.bullet}>{`- ${bullet}`}</Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {hasEducation ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>EDUCATION</Text>
            <Text style={styles.eduDegree}>
              {[degreeLabel, education.fieldOfStudy].filter(Boolean).join(" - ")}
            </Text>
            <Text style={styles.eduDetail}>
              {[education.institution, education.graduationYear]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export function buildTailoredResumeDocument(
  props: Props,
): ReactElement<DocumentProps> {
  return <TailoredResumeDocument {...props} />;
}
