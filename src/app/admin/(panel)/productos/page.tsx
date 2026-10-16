import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AdminProductsPage } from "@/domains/admin/products/components/admin_products_page";

export default function AdminProductsRoutePage() {
  const dictionary = getDictionary("es");

  return <AdminProductsPage dictionary={dictionary} />;
}
