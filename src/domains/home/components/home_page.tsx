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
      <FeaturedProductsSection dictionary={dictionary} products={products} />
      <CategoriesSection dictionary={dictionary} categories={categories} />
      <BenefitsSection
        dictionary={dictionary}
        product={products.find((product) => product.available && product.image)}
      />
      <AboutSection dictionary={dictionary} />
      <HelpSection dictionary={dictionary} />
      <ContactSection dictionary={dictionary} />
    </Box>
  );
}
