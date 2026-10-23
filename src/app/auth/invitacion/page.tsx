import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AcceptInvitationForm } from "@/domains/auth/components/accept_invitation_form";
import { AuthShell } from "@/domains/auth/components/auth_shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function InvitationPage() {
  const dictionary = getDictionary("es");
  return (
    <AuthShell
      dictionary={{ general: dictionary.general }}
      title={dictionary.auth.invitation.title}
      subtitle={dictionary.auth.invitation.subtitle}
    >
      <AcceptInvitationForm dictionary={{ auth: dictionary.auth }} />
    </AuthShell>
  );
}
