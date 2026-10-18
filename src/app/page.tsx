import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { getDictionary } from "@/dictionary/services/get-dictionary";
import { HomePage } from "@/domains/home/components/home_page";
import {
  getStorefrontCategories,
  getStorefrontListing,
} from "@/domains/storefront/services/catalog_service";
import { Box } from "@mui/material";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Hooks
  const dictionary = getDictionary("es");

  const [categories, listing] = await Promise.all([
    getStorefrontCategories(),
    getStorefrontListing({ featured: true }),
  ]);
  return (
    <Box>
      <Navbar dictionary={dictionary} />
      <HomePage
        dictionary={dictionary}
        categories={categories.filter((category) => !category.parentId)}
        products={listing?.items.slice(0, 4) ?? []}
      />
      <Footer dictionary={dictionary} />
    </Box>
  );
}
