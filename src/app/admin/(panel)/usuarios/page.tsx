import { getDictionary } from "@/dictionary/services/get-dictionary";
import { requireSuperAdminUser } from "@/domains/admin/services/require_admin_user";
import { AdminUsersPage } from "@/domains/admin/users/components/admin_users_page";

export default async function AdminUsersRoutePage() {
  await requireSuperAdminUser("/admin/usuarios");
  const dictionary = getDictionary("es");

  return <AdminUsersPage dictionary={dictionary} />;
}
