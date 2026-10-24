import dictionary from "@/dictionary/es.json";
import {
  getCatalogDictionary,
  getProductDictionary,
} from "./storefront_dictionary";

it("keeps operational guide, costs, users and auth copy out of public client props", () => {
  const catalog = getCatalogDictionary(dictionary);
  const product = getProductDictionary(dictionary);
  expect(Object.keys(catalog)).toEqual(["storefront"]);
  expect(Object.keys(product)).toEqual(["storefront", "cart"]);
  expect(product.cart).toBe(dictionary.cart);
  expect(catalog.storefront).toBe(dictionary.storefront);
  expect(JSON.stringify(product).length).toBeLessThan(
    JSON.stringify(dictionary).length / 10,
  );
});
