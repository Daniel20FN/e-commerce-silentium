"use client";

import Link from "@/components/navigation_link";
import { priceFormatter } from "@/utils/price_formatter";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import Image from "next/image";
import type { CatalogDictionary } from "../services/storefront_dictionary";
import type {
  StorefrontCategory,
  StorefrontProductCard,
} from "../types/catalog";

export function CatalogPrice({
  cents,
  compareAt,
  from = false,
  dictionary,
}: {
  cents: number;
  compareAt: number | null;
  from?: boolean;
  dictionary: CatalogDictionary;
}) {
  const copy = dictionary.storefront;
  return (
    <Stack spacing={0.5}>
      <Typography
        component="p"
        fontWeight={600}
        aria-label={`${copy.currentPrice}: ${from ? `${copy.from} ` : ""}${priceFormatter(cents / 100)}`}
      >
        {from ? `${copy.from} ` : ""}
        {priceFormatter(cents / 100)}
      </Typography>
      {compareAt !== null && compareAt > cents ? (
        <Typography
          component="p"
          variant="body2"
          color="text.secondary"
          aria-label={`${copy.previousPrice}: ${priceFormatter(compareAt / 100)}`}
          sx={{ textDecoration: "line-through" }}
        >
          {priceFormatter(compareAt / 100)}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function ProductCards({
  items,
  dictionary,
}: {
  items: StorefrontProductCard[];
  dictionary: CatalogDictionary;
}) {
  const copy = dictionary.storefront;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
        gap: { xs: 2, md: 3 },
      }}
    >
      {items.map((product) => (
        <Card
          key={product.id}
          variant="outlined"
          sx={{ minWidth: 0, height: "100%", borderRadius: 3 }}
        >
          <CardActionArea
            component={Link}
            href={`/productos/${product.slug}`}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
            }}
          >
            <Box
              sx={{
                aspectRatio: "1 / 1",
                position: "relative",
                bgcolor: "action.hover",
                display: "grid",
                placeItems: "center",
              }}
            >
              {product.image ? (
                <Image
                  src={product.image.url}
                  alt={product.image.alt}
                  fill
                  sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  textAlign="center"
                  sx={{ p: 2 }}
                >
                  {copy.noImage}
                </Typography>
              )}
            </Box>
            <CardContent sx={{ flex: 1, p: { xs: 1.5, sm: 2.5 } }}>
              <Stack spacing={1.5}>
                {product.brand ? (
                  <Typography variant="overline" color="text.secondary">
                    {product.brand}
                  </Typography>
                ) : null}
                <Typography
                  component="h3"
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {product.name}
                </Typography>
                <CatalogPrice
                  cents={product.priceCents}
                  compareAt={product.compareAtPriceCents}
                  from={product.hasMultiplePrices}
                  dictionary={dictionary}
                />
                <Chip
                  label={product.available ? copy.available : copy.soldOut}
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                />
                <Typography variant="body2" color="primary.main">
                  {copy.viewProduct}
                </Typography>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}

export function CategoryCards({
  items,
  dictionary,
}: {
  items: StorefrontCategory[];
  dictionary: CatalogDictionary;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
        },
        gap: 3,
      }}
    >
      {items.map((category) => (
        <Card key={category.id} variant="outlined" sx={{ borderRadius: 3 }}>
          <CardActionArea
            component={Link}
            href={`/categorias/${category.slug}`}
            sx={{ height: "100%" }}
          >
            {category.imageUrl ? (
              <Box
                component="img"
                src={category.imageUrl}
                alt={category.name}
                loading="lazy"
                sx={{
                  width: "100%",
                  aspectRatio: "16/9",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : null}
            <CardContent sx={{ p: 3 }}>
              <Typography component="h3" variant="h6" gutterBottom>
                {category.name}
              </Typography>
              {category.description ? (
                <Typography
                  color="text.secondary"
                  variant="body2"
                  sx={{ mb: 2 }}
                >
                  {category.description}
                </Typography>
              ) : null}
              <Typography color="primary.main" variant="body2">
                {dictionary.storefront.explore}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}

export function CatalogLink({ dictionary }: { dictionary: CatalogDictionary }) {
  return (
    <Button component={Link} href="/productos" variant="outlined">
      {dictionary.storefront.allProducts}
    </Button>
  );
}
