import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import {
  targetRoleLabel,
  type TailoredResumeContent,
  type TailoredResumeJob,
} from "@/agent/tailored-resume";
import { buildResumePdfDocument } from "@/lib/resume-pdf-document";
import type { Profile } from "@/types";

type Props = {
  profile: Profile;
  content: TailoredResumeContent;
  job: TailoredResumeJob;
};

export function buildTailoredResumeDocument(
  props: Props,
): ReactElement<DocumentProps> {
  return buildResumePdfDocument({
    profile: props.profile,
    content: props.content,
    documentTitle: `${props.profile.fullName} - Tailored Resume - ${props.job.title}`,
    targetRole: targetRoleLabel(props.job),
  });
}
