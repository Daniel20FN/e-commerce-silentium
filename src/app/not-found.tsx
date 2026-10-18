import { CatalogLayout } from "@/domains/storefront/components/catalog_layout";
import CatalogNotFound from "./(catalog)/not-found";

export default function NotFound() {
  return (
    <CatalogLayout>
      <CatalogNotFound />
    </CatalogLayout>
  );
}
