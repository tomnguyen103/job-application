import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import type { GeneratedResumeContent } from "@/agent/generator";
import { buildResumePdfDocument } from "@/lib/resume-pdf-document";
import type { Profile } from "@/types";

type Props = {
  profile: Profile;
  content: GeneratedResumeContent;
};

// route.ts is a .ts file and cannot use JSX, so it builds the element here.
// Typed as ReactElement<DocumentProps> to satisfy renderToBuffer's signature.
export function buildResumeDocument(props: Props): ReactElement<DocumentProps> {
  return buildResumePdfDocument({
    ...props,
    documentTitle: `${props.profile.fullName} - Resume`,
  });
}
