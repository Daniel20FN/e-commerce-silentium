"use client";

import { CatalogLayout } from "@/domains/storefront/components/catalog_layout";
import CatalogError from "./(catalog)/error";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <CatalogLayout>
      <CatalogError reset={reset} />
    </CatalogLayout>
  );
}
