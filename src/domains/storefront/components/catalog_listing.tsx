"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import type { StorefrontCategory, StorefrontListing } from "../types/catalog";
import { CategoryCards, ProductCards } from "./catalog_cards";

export function CatalogBreadcrumbs({
  items,
  dictionary,
  productName,
}: {
  items: StorefrontCategory[];
  dictionary: Dictionary;
  productName?: string;
}) {
  return (
    <Breadcrumbs
      aria-label={dictionary.storefront.categories}
      sx={{
        mb: 3,
        overflowWrap: "anywhere",
        "& a": {
          color: "inherit",
          textUnderlineOffset: "3px",
          "&:hover": { color: "text.primary" },
        },
      }}
    >
      <Link href="/">{dictionary.storefront.home}</Link>
      <Link href="/categorias">{dictionary.storefront.categories}</Link>
      {items.map((category) => (
        <Link key={category.id} href={`/categorias/${category.slug}`}>
          {category.name}
        </Link>
      ))}
      {productName ? (
        <Typography color="text.primary">{productName}</Typography>
      ) : null}
    </Breadcrumbs>
  );
}

export function CatalogListing({
  listing,
  dictionary,
  offers = false,
}: {
  listing: StorefrontListing;
  dictionary: Dictionary;
  offers?: boolean;
}) {
  const copy = dictionary.storefront;
  const base = listing.category
    ? `/categorias/${listing.category.slug}`
    : "/productos";
  const pageUrl = (page: number) =>
    `${base}?page=${page}${offers ? "&ofertas=1" : ""}`;
  return (
    <Container maxWidth="lg">
      <CatalogBreadcrumbs items={listing.breadcrumbs} dictionary={dictionary} />
      <Typography
        component="h1"
        variant="h3"
        sx={{ mb: 2, fontSize: { xs: "2rem", md: "3rem" } }}
      >
        {listing.category?.name ??
          (offers ? copy.offersTitle : copy.catalogTitle)}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 5, maxWidth: 700 }}>
        {listing.category?.description ??
          (offers ? copy.offersDescription : copy.catalogDescription)}
      </Typography>
      {listing.children.length ? (
        <Box component="section" sx={{ mb: 6 }}>
          <Typography component="h2" variant="h5" sx={{ mb: 2 }}>
            {copy.subcategories}
          </Typography>
          <CategoryCards items={listing.children} dictionary={dictionary} />
        </Box>
      ) : null}
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        {copy.results.replace("{count}", String(listing.total))}
      </Typography>
      {listing.items.length ? (
        <ProductCards items={listing.items} dictionary={dictionary} />
      ) : (
        <Typography role="status" sx={{ py: 6 }}>
          {copy.emptyProducts}
        </Typography>
      )}
      {listing.pageCount > 1 ? (
        <Stack
          component="nav"
          aria-label={copy.page
            .replace("{page}", String(listing.page))
            .replace("{total}", String(listing.pageCount))}
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="center"
          sx={{ mt: 5, flexWrap: "wrap", rowGap: 2 }}
        >
          {listing.page > 1 ? (
            <Button
              component={Link}
              href={pageUrl(listing.page - 1)}
              rel="prev"
            >
              {copy.previous}
            </Button>
          ) : (
            <Button disabled>{copy.previous}</Button>
          )}
          <Typography variant="body2">
            {copy.page
              .replace("{page}", String(listing.page))
              .replace("{total}", String(listing.pageCount))}
          </Typography>
          {listing.page < listing.pageCount ? (
            <Button
              component={Link}
              href={pageUrl(listing.page + 1)}
              rel="next"
            >
              {copy.next}
            </Button>
          ) : (
            <Button disabled>{copy.next}</Button>
          )}
        </Stack>
      ) : null}
    </Container>
  );
}
