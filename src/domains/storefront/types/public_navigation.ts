import type { Dictionary } from "@/dictionary/services/get-dictionary";

export interface PublicNavigationDictionary {
  navigation: Dictionary["navigation"];
  auth: { navbar: Dictionary["auth"]["navbar"] };
  admin: { navigation: { panel: string } };
  storefront: Pick<
    Dictionary["storefront"],
    "openNavigation" | "closeNavigation" | "toggleTheme"
  >;
  landing: Pick<
    Dictionary["landing"],
    "skipLink" | "mainNavigation" | "helpLink" | "sessionMenu"
  >;
  cart: Pick<Dictionary["cart"], "title" | "navCount">;
}
