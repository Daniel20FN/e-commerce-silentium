import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { CompanyValues } from "@/values/app_values";
import {
  SALES_EMAIL,
  SALES_INSTAGRAM_URL,
  SALES_WHATSAPP_PHONE,
} from "@/values/sales_contact";
import type { StorefrontProduct, StorefrontVariant } from "../types/catalog";
import { storefrontUrl } from "./seo_rules";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdDocument
  | JsonLdValue[];
export interface JsonLdDocument {
  [key: string]: JsonLdValue | undefined;
}

export function serializeJsonLd(data: JsonLdDocument): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationStructuredData(
  dictionary: Dictionary,
): JsonLdDocument {
  const organizationId = storefrontUrl("/#organization");
  const websiteId = storefrontUrl("/#website");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: CompanyValues.name,
        url: storefrontUrl("/"),
        logo: storefrontUrl("/brand/wordmark.svg"),
        telephone: `+${SALES_WHATSAPP_PHONE}`,
        email: SALES_EMAIL,
        sameAs: [SALES_INSTAGRAM_URL],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: `+${SALES_WHATSAPP_PHONE}`,
          email: SALES_EMAIL,
          url: storefrontUrl("/#contacto"),
          availableLanguage: "es",
        },
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: CompanyValues.name,
        url: storefrontUrl("/"),
        inLanguage: "es-CO",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "WebPage",
        "@id": storefrontUrl("/#webpage"),
        url: storefrontUrl("/"),
        name: dictionary.storefront.brandTitle,
        description: dictionary.landing.footer.description,
        inLanguage: "es-CO",
        isPartOf: { "@id": websiteId },
        about: { "@id": organizationId },
        hasPart: [
          {
            "@type": "WebPageElement",
            "@id": storefrontUrl("/#nosotros"),
            name: `${dictionary.landing.about.titleLead} ${dictionary.landing.about.titleTail}`,
            description: dictionary.landing.about.statement,
          },
          {
            "@type": "WebPageElement",
            "@id": storefrontUrl("/#contacto"),
            name: dictionary.landing.contact.title,
            description: dictionary.landing.contact.description,
          },
        ],
      },
    ],
  };
}

export function productStructuredData(
  product: StorefrontProduct,
  variant: StorefrontVariant | null | undefined,
): JsonLdDocument | null {
  if (
    !variant ||
    !Number.isSafeInteger(variant.priceCents) ||
    variant.priceCents < 0 ||
    !Number.isSafeInteger(variant.stock) ||
    variant.stock < 0
  )
    return null;
  const url = storefrontUrl(`/productos/${encodeURIComponent(product.slug)}`);
  const gallery = variant.images.length ? variant.images : product.images;
  const properties = product.options.flatMap((option) => {
    const value = option.values.find((item) =>
      variant.optionValueIds.includes(item.id),
    );
    return value
      ? [{ "@type": "PropertyValue", name: option.name, value: value.value }]
      : [];
  });
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#variant-${encodeURIComponent(variant.id)}`,
    url,
    name: product.name,
    sku: variant.sku,
    ...(product.shortDescription
      ? { description: product.shortDescription }
      : {}),
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    ...(gallery.length ? { image: gallery.map((item) => item.url) } : {}),
    ...(properties.length ? { additionalProperty: properties } : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "COP",
      price: (variant.priceCents / 100).toFixed(2),
      availability: `https://schema.org/${variant.stock > 0 ? "InStock" : "OutOfStock"}`,
      seller: { "@id": storefrontUrl("/#organization") },
    },
  };
}
