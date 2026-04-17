import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AdminUsersPage } from "@/domains/admin/users/components/admin_users_page";

export default function AdminUsersRoutePage() {
  const dictionary = getDictionary("es");

  return <AdminUsersPage dictionary={dictionary} />;
}
