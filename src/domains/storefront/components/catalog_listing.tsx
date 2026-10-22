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
import {
  activeCatalogFilters,
  catalogFilters,
  catalogQueryString,
} from "../services/catalog_filters";
import type { StorefrontCategory, StorefrontListing } from "../types/catalog";
import { ProductCards } from "./catalog_cards";
import {
  CatalogFilterSidebar,
  CatalogMobileFilters,
  CatalogSortControl,
} from "./catalog_filters";

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
  const filters = listing.filters ?? catalogFilters({ offers });
  const filterProps = {
    dictionary,
    filters,
    categories: listing.filterCategories ?? [],
    base,
    scoped: Boolean(listing.category),
  };
  const pageUrl = (page: number) =>
    `${base}?${catalogQueryString(filters, page)}`;
  const filtered = activeCatalogFilters(filters) > 0;
  return (
    <Container maxWidth="xl">
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
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "248px minmax(0, 1fr)",
          },
          gap: { xs: 0, md: 4, lg: 5 },
          alignItems: "start",
        }}
      >
        <CatalogFilterSidebar {...filterProps} />
        <Box sx={{ minWidth: 0 }}>
          <CatalogMobileFilters {...filterProps} />
          {listing.children.length ? (
            <Box component="section" sx={{ mb: 3 }}>
              <Typography component="h2" variant="h5" sx={{ mb: 2 }}>
                {copy.subcategories}
              </Typography>
              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                {listing.children.map((child) => (
                  <Button
                    key={child.id}
                    component={Link}
                    variant="outlined"
                    size="small"
                    href={`/categorias/${child.slug}?${catalogQueryString({ ...filters, category: "" })}`}
                  >
                    {child.name}
                  </Button>
                ))}
              </Stack>
            </Box>
          ) : null}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <Box aria-live="polite">
              <Typography variant="body2">
                {copy.results.replace("{count}", String(listing.total))}
              </Typography>
              {filtered ? (
                <Typography variant="caption" color="text.secondary">
                  {copy.filters.active.replace(
                    "{count}",
                    String(activeCatalogFilters(filters)),
                  )}
                </Typography>
              ) : null}
            </Box>
            <CatalogSortControl
              filters={filters}
              base={base}
              dictionary={dictionary}
            />
          </Stack>
          {listing.items.length ? (
            <ProductCards items={listing.items} dictionary={dictionary} />
          ) : (
            <Stack
              role="status"
              spacing={2}
              sx={{ py: 6, alignItems: "flex-start" }}
            >
              <Typography>
                {filtered ? copy.filters.emptyTitle : copy.emptyProducts}
              </Typography>
              {filtered ? (
                <>
                  <Typography color="text.secondary">
                    {copy.filters.emptyBody}
                  </Typography>
                  <Button component={Link} href={base} variant="outlined">
                    {copy.filters.clear}
                  </Button>
                </>
              ) : null}
            </Stack>
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
                  variant="outlined"
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
                  variant="outlined"
                  rel="next"
                >
                  {copy.next}
                </Button>
              ) : (
                <Button disabled>{copy.next}</Button>
              )}
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Container>
  );
}
