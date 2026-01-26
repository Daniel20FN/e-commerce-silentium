import { Dictionary } from "@/dictionary/services/get-dictionary";
import { FeaturedProductsSection } from "@/domains/products/components/featured_products_section";
import { Box } from "@mui/material";
import { BenefitsSection } from "./sections/benefits_sections";
import { CategoriesSection } from "./sections/categories_section";
import { HeroSection } from "./sections/hero_section";
import { NewsletterSection } from "./sections/newsletter_section";
import { TestimonialsSection } from "./sections/testimonial_section";

export function HomePage({ dictionary }: { dictionary: Dictionary }) {
  return (
    <Box>
      <HeroSection dictionary={dictionary} />
      <CategoriesSection dictionary={dictionary} />
      <FeaturedProductsSection dictionary={dictionary} />
      <BenefitsSection dictionary={dictionary} />
      <TestimonialsSection dictionary={dictionary} />
      <NewsletterSection dictionary={dictionary} />
    </Box>
  );
}
