import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { HomePage } from "@/domains/home/components/home_page";
import { LandingShell } from "@/domains/home/components/landing_shell";
import {
  getStorefrontCategories,
  getStorefrontListing,
} from "@/domains/storefront/services/catalog_service";
import { getPublicNavigationDictionary } from "@/domains/storefront/services/public_navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Hooks
  const dictionary = getDictionary("es");

  const [categories, listing] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontListing({ featured: true }),
  ]);
  return (
    <LandingShell>
      <Navbar
        dictionary={getPublicNavigationDictionary(dictionary)}
        immersive
      />
      <HomePage
        dictionary={dictionary}
        categories={categories.filter((category) => !category.parentId)}
        products={listing?.items.slice(0, 4) ?? []}
      />
      <Footer dictionary={dictionary} />
    </LandingShell>
  );
}
