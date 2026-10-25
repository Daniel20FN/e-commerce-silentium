import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { HomePage } from "@/domains/home/components/home_page";
import { LandingShell } from "@/domains/home/components/landing_shell";
import {
  getStorefrontCategories,
  getStorefrontFeaturedProducts,
} from "@/domains/storefront/services/catalog_service";
import { getPublicNavigationDictionary } from "@/domains/storefront/services/public_navigation";
import { canonicalMetadata } from "@/domains/storefront/services/seo_rules";

export const dynamic = "force-dynamic";
export const metadata = canonicalMetadata("/");

export default async function Home() {
  // Hooks
  const dictionary = getDictionary("es");

  const [categories, products] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontFeaturedProducts(),
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
        products={products}
      />
      <Footer dictionary={dictionary} />
    </LandingShell>
  );
}
