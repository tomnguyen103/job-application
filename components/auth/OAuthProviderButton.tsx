import type { ReactElement } from "react";

import { OAuthSubmitButton } from "@/components/auth/OAuthSubmitButton";

type OAuthProviderButtonProps = {
  action: () => Promise<never>;
  badge: string;
  label: string;
};

export function OAuthProviderButton({
  action,
  badge,
  label,
}: OAuthProviderButtonProps): ReactElement {
  return (
    <form action={action} className="w-full">
      <OAuthSubmitButton badge={badge} label={label} />
    </form>
  );
}
