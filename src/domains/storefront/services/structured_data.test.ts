/** @jest-environment node */
import dictionary from "@/dictionary/es.json";
import type { StorefrontProduct, StorefrontVariant } from "../types/catalog";
import {
  organizationStructuredData,
  productStructuredData,
  serializeJsonLd,
} from "./structured_data";

const image = {
  id: "photo",
  url: "https://images.example.com/linen.jpg",
  alt: "Lino",
};
const variant: StorefrontVariant = {
  id: "v1",
  sku: "LIN-01",
  priceCents: 5990000,
  compareAtPriceCents: null,
  stock: 3,
  isDefault: true,
  optionValueIds: ["double"],
  images: [],
};
const product: StorefrontProduct = {
  id: "p1",
  slug: "sabana-lino",
  name: "Sábana Lino",
  brand: null,
  shortDescription: "Suavidad para tu cama.",
  longDescription: null,
  seoTitle: null,
  seoDescription: null,
  categories: [],
  breadcrumbs: [],
  options: [
    { id: "size", name: "Medida", values: [{ id: "double", value: "Doble" }] },
  ],
  variants: [variant],
  images: [image],
  initialVariantId: "v1",
  image,
  priceCents: 5990000,
  compareAtPriceCents: null,
  hasMultiplePrices: false,
  available: true,
};

it("describes the real brand and same-page contact without inventing legal or commercial facts", () => {
  const data = organizationStructuredData(dictionary);
  const serialized = serializeJsonLd(data);
  expect(data["@context"]).toBe("https://schema.org");
  expect(serialized).toContain('"@type":"Organization"');
  expect(serialized).toContain('"@type":"WebSite"');
  expect(serialized).toContain('"telephone":"+573166218114"');
  expect(serialized).toContain('"email":"contacto@silentium-hogar.com"');
  expect(serialized).toContain(
    '"sameAs":["https://www.instagram.com/silentium.hogar/"]',
  );
  expect(serialized).toContain("https://www.silentium-hogar.com/#contacto");
  expect(serialized).toContain("https://www.silentium-hogar.com/#nosotros");
  expect(serialized).not.toMatch(
    /taxID|address|openingHours|returnPolicy|shipping|SearchAction/,
  );
});
it("projects exact selected-variant price, SKU, attributes and public gallery", () => {
  const data = productStructuredData(product, variant);
  expect(data).toMatchObject({
    "@type": "Product",
    name: product.name,
    sku: variant.sku,
    image: [image.url],
    additionalProperty: [
      { "@type": "PropertyValue", name: "Medida", value: "Doble" },
    ],
    offers: {
      "@type": "Offer",
      price: "59900.00",
      priceCurrency: "COP",
      availability: "https://schema.org/InStock",
      url: "https://www.silentium-hogar.com/productos/sabana-lino",
    },
  });
  if (!data) throw new Error("expected_product_schema");
  expect(serializeJsonLd(data)).not.toMatch(
    /stock|cost|margin|compareAt|password|aggregateRating|review|gtin|priceValidUntil|shippingDetails/,
  );
});
it("uses current public variant photos and availability without fabricating photos or branding", () => {
  const data = productStructuredData(
    { ...product, brand: "Marca Textil" },
    {
      ...variant,
      stock: 0,
      images: [{ ...image, url: "https://images.example.com/variant.jpg" }],
    },
  );
  expect(data).toMatchObject({
    image: ["https://images.example.com/variant.jpg"],
    brand: { "@type": "Brand", name: "Marca Textil" },
    offers: { availability: "https://schema.org/OutOfStock" },
  });
  const missing = productStructuredData({ ...product, images: [] }, variant);
  expect(missing).not.toHaveProperty("image");
  expect(missing).not.toHaveProperty("brand");
});
it("omits invalid or unresolved offers instead of declaring a misleading price", () => {
  expect(productStructuredData(product, null)).toBeNull();
  for (const invalid of [
    { priceCents: NaN },
    { priceCents: -1 },
    { priceCents: 1.5 },
    { stock: -1 },
  ]) {
    expect(
      productStructuredData(product, { ...variant, ...invalid }),
    ).toBeNull();
  }
});
it("escapes script-ending user text and preserves the original data when parsed as JSON", () => {
  const name = '</script><script>alert("x")</script>';
  const data = { name, url: "https://www.silentium-hogar.com/" };
  const serialized = serializeJsonLd(data);
  expect(serialized).not.toContain("<");
  expect(serialized).toContain("\\u003c/script>");
  expect(JSON.parse(serialized)).toEqual(data);
});
