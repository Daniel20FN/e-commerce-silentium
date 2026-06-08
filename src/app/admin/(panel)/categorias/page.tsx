import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AdminCategoriesPage } from "@/domains/admin/categories/components/admin_categories_page";

export default function AdminCategoriesRoutePage() {
  const dictionary = getDictionary("es");

  return <AdminCategoriesPage dictionary={dictionary} />;
}
