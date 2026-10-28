import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AccountPage } from "@/domains/account/components/account_page";
import { readAccount } from "@/domains/account/services/account_service";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { LegalSettings } from "@/domains/legal/components/legal_settings";
import { getLegalUiCopy } from "@/domains/legal/services/legal_ui_copy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: getDictionary("es").account.title,
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await resolveCurrentUser(await createServerSupabaseClient());
  if (!user || !user.emailVerified) redirect("/login?returnTo=%2Faccount");
  return (
    <>
      <AccountPage
        initial={await readAccount(user)}
        copy={getDictionary("es").account}
      />
      <LegalSettings copy={getLegalUiCopy(getDictionary("es"))} />
    </>
  );
}
