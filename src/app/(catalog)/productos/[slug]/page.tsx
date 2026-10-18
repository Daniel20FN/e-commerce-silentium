import { getDictionary } from "@/dictionary/services/get-dictionary";
import { ProductDetail } from "@/domains/storefront/components/product_detail";
import { getStorefrontProduct } from "@/domains/storefront/services/catalog_service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  return product
    ? {
        title: product.seoTitle ?? product.name,
        description:
          product.seoDescription ?? product.shortDescription ?? undefined,
        openGraph: {
          title: product.name,
          ...(product.image
            ? { images: [{ url: product.image.url, alt: product.image.alt }] }
            : {}),
        },
      }
    : {
        title: getDictionary("es").storefront.notFoundTitle,
        robots: { index: false, follow: false },
      };
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  const product = await getStorefrontProduct(slug);
  if (!product) notFound();
  return (
    <ProductDetail
      key={product.id}
      product={product}
      dictionary={getDictionary("es")}
    />
  );
}
