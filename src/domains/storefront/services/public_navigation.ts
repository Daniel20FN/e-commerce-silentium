import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { PublicNavigationDictionary } from "../types/public_navigation";

export function getPublicNavigationDictionary(
  dictionary: Dictionary,
): PublicNavigationDictionary {
  return {
    navigation: dictionary.navigation,
    auth: { navbar: dictionary.auth.navbar },
    admin: { navigation: { panel: dictionary.admin.navigation.panel } },
    storefront: {
      openNavigation: dictionary.storefront.openNavigation,
      closeNavigation: dictionary.storefront.closeNavigation,
      toggleTheme: dictionary.storefront.toggleTheme,
    },
    landing: {
      skipLink: dictionary.landing.skipLink,
      mainNavigation: dictionary.landing.mainNavigation,
      helpLink: dictionary.landing.helpLink,
      sessionMenu: dictionary.landing.sessionMenu,
    },
    cart: { title: dictionary.cart.title, navCount: dictionary.cart.navCount },
  };
}
