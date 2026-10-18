import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CategoryCards } from "@/domains/storefront/components/catalog_cards";
import { getStorefrontCategories } from "@/domains/storefront/services/catalog_service";
import { Container, Stack, Typography } from "@mui/material";
export const metadata = {
  title: getDictionary("es").storefront.categoriesTitle,
};
export default async function Page() {
  const dictionary = getDictionary("es");
  const categories = await getStorefrontCategories();
  return (
    <Container maxWidth="lg">
      <Stack spacing={3}>
        <Typography
          component="h1"
          variant="h3"
          sx={{ fontSize: { xs: "2rem", md: "3rem" } }}
        >
          {dictionary.storefront.categoriesTitle}
        </Typography>
        <Typography color="text.secondary">
          {dictionary.storefront.categoriesDescription}
        </Typography>
        {categories.length ? (
          <CategoryCards
            items={categories.filter((category) => !category.parentId)}
            dictionary={dictionary}
          />
        ) : (
          <Typography role="status">
            {dictionary.storefront.emptyCategories}
          </Typography>
        )}
      </Stack>
    </Container>
  );
}
