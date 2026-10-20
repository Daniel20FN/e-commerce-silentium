import { getDictionary } from "@/dictionary/services/get-dictionary";
import { ProductWorkspace } from "@/domains/admin/products/components/product_workspace";

export default async function ProductWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{
    section?: string;
    returnTo?: string;
    generate?: string;
  }>;
}) {
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  return (
    <ProductWorkspace
      key={productId}
      dictionary={getDictionary("es")}
      productId={productId}
      initialSection={query.section}
      initialGenerate={query.generate === "1"}
      returnTo={query.returnTo}
    />
  );
}
