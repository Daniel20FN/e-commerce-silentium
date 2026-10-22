import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AdminShell } from "@/domains/admin/components/admin_shell";
import { adminNavigationDictionary } from "@/domains/admin/services/admin_route_metadata";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dictionary = getDictionary("es");
  const currentUser = await requireAdminUser();

  return (
    <AdminShell
      dictionary={adminNavigationDictionary(dictionary)}
      currentUser={currentUser}
    >
      {children}
    </AdminShell>
  );
}
