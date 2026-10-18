import { getDictionary } from "@/dictionary/services/get-dictionary";
import { CatalogLink } from "@/domains/storefront/components/catalog_cards";
import { Container, Stack, Typography } from "@mui/material";
export default function NotFound() {
  const dictionary = getDictionary("es");
  return (
    <Container maxWidth="md">
      <Stack spacing={3}>
        <Typography variant="h3" component="h1">
          {dictionary.storefront.notFoundTitle}
        </Typography>
        <Typography>{dictionary.storefront.notFoundBody}</Typography>
        <CatalogLink dictionary={dictionary} />
      </Stack>
    </Container>
  );
}
