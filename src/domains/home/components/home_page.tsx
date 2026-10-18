import { Dictionary } from "@/dictionary/services/get-dictionary";
import { FeaturedProductsSection } from "@/domains/products/components/featured_products_section";
import type {
  StorefrontCategory,
  StorefrontProductCard,
} from "@/domains/storefront/types/catalog";
import { Box } from "@mui/material";
import { BenefitsSection } from "./sections/benefits_sections";
import { CategoriesSection } from "./sections/categories_section";
import { HeroSection } from "./sections/hero_section";
import { NewsletterSection } from "./sections/newsletter_section";
import { TestimonialsSection } from "./sections/testimonial_section";

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
    <Box>
      <HeroSection dictionary={dictionary} />
      <CategoriesSection dictionary={dictionary} categories={categories} />
      <FeaturedProductsSection dictionary={dictionary} products={products} />
      <BenefitsSection dictionary={dictionary} />
      <TestimonialsSection dictionary={dictionary} />
      <NewsletterSection dictionary={dictionary} />
    </Box>
  );
}
