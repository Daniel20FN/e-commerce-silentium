import { getDictionary } from "@/dictionary/services/get-dictionary";
import { getProductPreview } from "@/domains/admin/products/services/publication_service";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import { ProductDetail } from "@/domains/storefront/components/product_detail";
import { Alert, Box } from "@mui/material";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: getDictionary("es").admin.products.publication.previewTitle,
  robots: { index: false, follow: false, noarchive: true },
};

export default async function PreviewContentPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  await requireAdminUser(
    `/admin/productos/${encodeURIComponent(productId)}/preview`,
  );
  const dictionary = getDictionary("es");
  const product = await getProductPreview(productId);
  if (!product)
    return (
      <Alert severity="warning">
        {dictionary.admin.products.publication.previewUnavailable}
      </Alert>
    );
  return (
    <Box sx={{ py: 3 }}>
      <Alert severity="info" sx={{ mx: 2, mb: 3 }}>
        {dictionary.admin.products.publication.previewDescription}
      </Alert>
      <ProductDetail
        key={product.id}
        product={product}
        dictionary={dictionary}
        preview
      />
    </Box>
  );
}
