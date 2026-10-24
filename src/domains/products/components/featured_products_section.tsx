import Link from "@/components/navigation_link";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import styles from "@/domains/home/components/landing.module.css";
import { sectionAnchorSx } from "@/domains/home/services/landing_links";
import {
  CatalogLink,
  ProductCards,
} from "@/domains/storefront/components/catalog_cards";
import { getCatalogDictionary } from "@/domains/storefront/services/storefront_dictionary";
import type { StorefrontProductCard } from "@/domains/storefront/types/catalog";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
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
      id="productos"
      aria-labelledby="featured-title"
      tabIndex={-1}
      className={styles.featured}
      sx={{
        ...sectionAnchorSx,
        py: { xs: 7, md: 10 },
        bgcolor: "action.hover",
      }}
    >
      <Container maxWidth="lg" data-reveal="rise">
        <Stack spacing={3}>
          <Typography
            component="h2"
            id="featured-title"
            variant="h3"
            sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" } }}
          >
            {copy.featuredTitle}
          </Typography>
          <Typography color="text.secondary">
            {copy.featuredDescription}
          </Typography>
          {products.length ? (
            <ProductCards
              items={products}
              dictionary={getCatalogDictionary(dictionary)}
            />
          ) : (
            <Typography role="status">{copy.emptyFeatured}</Typography>
          )}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <CatalogLink dictionary={getCatalogDictionary(dictionary)} />
            <Button component={Link} href="/ofertas">
              {dictionary.navigation.offers}
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
