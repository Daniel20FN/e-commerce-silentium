export interface StorefrontImage {
  id: string;
  url: string;
  alt: string;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface StorefrontVariant {
  id: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  isDefault: boolean;
  optionValueIds: string[];
  images: StorefrontImage[];
}

export interface StorefrontOption {
  id: string;
  name: string;
  values: { id: string; value: string }[];
}

export interface StorefrontProductCard {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  brand: string | null;
  image: StorefrontImage | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  hasMultiplePrices: boolean;
  available: boolean;
}

export interface StorefrontProduct extends StorefrontProductCard {
  longDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  categories: StorefrontCategory[];
  breadcrumbs: StorefrontCategory[];
  options: StorefrontOption[];
  variants: StorefrontVariant[];
  images: StorefrontImage[];
  initialVariantId: string;
}

export interface StorefrontListing {
  items: StorefrontProductCard[];
  page: number;
  pageCount: number;
  total: number;
  category: StorefrontCategory | null;
  breadcrumbs: StorefrontCategory[];
  children: StorefrontCategory[];
}
