import { CatalogLayout } from "@/domains/storefront/components/catalog_layout";
export const dynamic = "force-dynamic";
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <CatalogLayout>{children}</CatalogLayout>;
}
