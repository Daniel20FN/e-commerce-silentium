import type { Dictionary } from "@/dictionary/services/get-dictionary";

export type CatalogDictionary = Pick<Dictionary, "storefront">;
export type ProductDictionary = Pick<Dictionary, "storefront" | "cart">;

export function getCatalogDictionary(
  dictionary: Dictionary,
): CatalogDictionary {
  return { storefront: dictionary.storefront };
}

export function getProductDictionary(
  dictionary: Dictionary,
): ProductDictionary {
  return { storefront: dictionary.storefront, cart: dictionary.cart };
}
