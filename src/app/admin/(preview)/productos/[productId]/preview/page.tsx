import { getDictionary } from "@/dictionary/services/get-dictionary";
import { ProductPreviewFrame } from "@/domains/admin/products/components/product_preview_frame";
import {
  productWorkspaceHref,
  safeProductsReturnUrl,
} from "@/domains/admin/products/services/product_workspace_links";
import { getProductPreview } from "@/domains/admin/products/services/publication_service";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: getDictionary("es").admin.products.publication.previewTitle,
  robots: { index: false, follow: false, noarchive: true },
};

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  await requireAdminUser(
    `/admin/productos/${encodeURIComponent(productId)}/preview`,
  );
  const back = safeProductsReturnUrl(
    typeof query.returnTo === "string" ? query.returnTo : undefined,
  );
  const product = await getProductPreview(productId);
  return (
    <ProductPreviewFrame
      dictionary={getDictionary("es")}
      productId={productId}
      product={product}
      backHref={productWorkspaceHref(productId, "publication", back)}
    />
  );
}
