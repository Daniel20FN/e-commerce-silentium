import dictionary from "@/dictionary/es.json";
import { getPublicNavigationDictionary } from "./public_navigation";

it("serializes only navbar copy, not admin forms, costs, catalog contracts or full landing content", () => {
  const copy = getPublicNavigationDictionary(dictionary);
  expect(copy.admin).toEqual({
    navigation: { panel: dictionary.admin.navigation.panel },
  });
  expect(Object.keys(copy.cart).sort()).toEqual(["navCount", "title"]);
  expect(Object.keys(copy.landing).sort()).toEqual([
    "helpLink",
    "mainNavigation",
    "sessionMenu",
    "skipLink",
  ]);
  expect(JSON.stringify(copy).length).toBeLessThan(
    JSON.stringify(dictionary).length / 3,
  );
});
