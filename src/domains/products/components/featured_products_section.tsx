import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  CatalogLink,
  ProductCards,
} from "@/domains/storefront/components/catalog_cards";
import type { StorefrontProductCard } from "@/domains/storefront/types/catalog";
import { Box, Container, Stack, Typography } from "@mui/material";
export function FeaturedProductsSection({
  dictionary,
  products,
}: {
  dictionary: Dictionary;
  products: StorefrontProductCard[];
}) {
  const copy = dictionary.storefront;
  return (
    <Box
      component="section"
      sx={{ py: { xs: 7, md: 10 }, bgcolor: "action.hover" }}
    >
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Typography
            component="h2"
            variant="h3"
            sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" } }}
          >
            {copy.featuredTitle}
          </Typography>
          <Typography color="text.secondary">
            {copy.featuredDescription}
          </Typography>
          {products.length ? (
            <ProductCards items={products} dictionary={dictionary} />
          ) : (
            <Typography role="status">{copy.emptyFeatured}</Typography>
          )}
          <Box>
            <CatalogLink dictionary={dictionary} />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
