import { Dictionary } from "@/dictionary/services/get-dictionary";
import { FeaturedProductsSection } from "@/domains/products/components/featured_products_section";
import type {
  StorefrontCategory,
  StorefrontProductCard,
} from "@/domains/storefront/types/catalog";
import { Box, GlobalStyles } from "@mui/material";
import { AboutSection } from "./sections/about_section";
import { BenefitsSection } from "./sections/benefits_sections";
import { CategoriesSection } from "./sections/categories_section";
import { ContactSection } from "./sections/contact_section";
import { HelpSection } from "./sections/help_section";
import { HeroSection } from "./sections/hero_section";

export function HomePage({
  dictionary,
  categories,
  products,
}: {
  dictionary: Dictionary;
  categories: StorefrontCategory[];
  products: StorefrontProductCard[];
}) {
  return (
    <Box component="main" id="contenido" tabIndex={-1}>
      <GlobalStyles
        styles={{
          html: {
            scrollBehavior: "smooth",
            "@media (prefers-reduced-motion: reduce)": {
              scrollBehavior: "auto",
            },
          },
        }}
      />
      <HeroSection dictionary={dictionary} />
      <CategoriesSection dictionary={dictionary} categories={categories} />
      <FeaturedProductsSection dictionary={dictionary} products={products} />
      <BenefitsSection dictionary={dictionary} />
      <AboutSection dictionary={dictionary} image={products[0]?.image} />
      <HelpSection dictionary={dictionary} />
      <ContactSection dictionary={dictionary} />
    </Box>
  );
}
