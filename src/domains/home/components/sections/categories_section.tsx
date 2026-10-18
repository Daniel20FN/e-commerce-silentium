import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { CategoryCards } from "@/domains/storefront/components/catalog_cards";
import type { StorefrontCategory } from "@/domains/storefront/types/catalog";
import { Box, Container, Stack, Typography } from "@mui/material";
export function CategoriesSection({
  dictionary,
  categories,
}: {
  dictionary: Dictionary;
  categories: StorefrontCategory[];
}) {
  const copy = dictionary.storefront;
  return (
    <Box component="section" sx={{ py: { xs: 7, md: 10 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Typography
            component="h2"
            variant="h3"
            sx={{ fontSize: { xs: "1.75rem", md: "2.5rem" } }}
          >
            {copy.categoriesTitle}
          </Typography>
          <Typography color="text.secondary">
            {copy.categoriesDescription}
          </Typography>
          {categories.length ? (
            <CategoryCards items={categories} dictionary={dictionary} />
          ) : (
            <Typography role="status">{copy.emptyCategories}</Typography>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
