"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { AddToCart } from "@/domains/cart/components/add_to_cart";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  canSelectOptionValue,
  resolveVariant,
} from "../services/catalog_rules";
import type { StorefrontImage, StorefrontProduct } from "../types/catalog";
import { CatalogPrice } from "./catalog_cards";
import { CatalogBreadcrumbs } from "./catalog_listing";

function ProductGallery({
  images,
  dictionary,
}: {
  images: StorefrontImage[];
  dictionary: Dictionary;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          aspectRatio: "1/1",
          position: "relative",
          bgcolor: "action.hover",
          borderRadius: 3,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
        }}
      >
        {current ? (
          <Image
            src={current.url}
            alt={current.alt}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            style={{ objectFit: "contain" }}
            priority
          />
        ) : (
          <Typography color="text.secondary">
            {dictionary.storefront.noImage}
          </Typography>
        )}
      </Box>
      {images.length > 1 ? (
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
          {images.map((image, imageIndex) => (
            <Button
              key={image.id}
              aria-label={dictionary.storefront.imageNumber.replace(
                "{number}",
                String(imageIndex + 1),
              )}
              aria-pressed={index === imageIndex}
              variant={index === imageIndex ? "outlined" : "text"}
              onClick={() => setIndex(imageIndex)}
              sx={{
                minWidth: 64,
                width: 72,
                height: 72,
                p: 0.5,
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={image.url}
                alt=""
                sx={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </Button>
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}

export function ProductDetail({
  product,
  dictionary,
  preview = false,
}: {
  product: StorefrontProduct;
  dictionary: Dictionary;
  preview?: boolean;
}) {
  const copy = dictionary.storefront;
  const initial = product.variants.find(
    (variant) => variant.id === product.initialVariantId,
  );
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.options.flatMap((option) => {
        const value = option.values.find((item) =>
          initial?.optionValueIds.includes(item.id),
        );
        return value ? [[option.id, value.id]] : [];
      }),
    ),
  );
  const variant = resolveVariant(product.variants, selected);
  const gallery = variant?.images.length ? variant.images : product.images;
  const complete = product.options.every((option) => selected[option.id]);
  return (
    <Box
      sx={
        preview
          ? { containerType: "inline-size", containerName: "product-preview" }
          : undefined
      }
    >
      <Container
        maxWidth="lg"
        disableGutters={preview}
        sx={
          preview
            ? {
                px: 2,
                "@container product-preview (min-width: 600px)": { px: 3 },
              }
            : undefined
        }
      >
        {!preview && (
          <CatalogBreadcrumbs
            items={product.breadcrumbs}
            dictionary={dictionary}
            productName={product.name}
          />
        )}
        {preview && !product.variants.length && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {dictionary.admin.products.publication.previewEmpty}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: preview
              ? "minmax(0, 1fr)"
              : {
                  xs: "minmax(0, 1fr)",
                  md: "minmax(0, 1.1fr) minmax(0, 1fr)",
                },
            gap: preview ? 4 : { xs: 4, md: 7 },
            ...(preview && {
              "@container product-preview (min-width: 900px)": {
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
                gap: 7,
              },
            }),
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <ProductGallery
              key={variant?.id ?? "general"}
              images={gallery}
              dictionary={dictionary}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mt: 1.5 }}
            >
              {variant?.images.length
                ? copy.variantGallery
                : copy.productGallery}
            </Typography>
          </Box>
          <Stack spacing={3} sx={{ minWidth: 0 }}>
            {product.brand ? (
              <Typography variant="overline" color="text.secondary">
                {product.brand}
              </Typography>
            ) : null}
            <Typography
              component="h1"
              variant="h3"
              sx={{
                fontSize: preview ? "2rem" : { xs: "2rem", md: "2.75rem" },
                ...(preview && {
                  "@container product-preview (min-width: 900px)": {
                    fontSize: "2.75rem",
                  },
                }),
                overflowWrap: "anywhere",
              }}
            >
              {product.name}
            </Typography>
            {product.shortDescription ? (
              <Typography color="text.secondary">
                {product.shortDescription}
              </Typography>
            ) : null}
            <Box role="status" aria-live="polite" aria-atomic="true">
              {variant ? (
                <Stack spacing={1.5}>
                  <CatalogPrice
                    cents={variant.priceCents}
                    compareAt={variant.compareAtPriceCents}
                    dictionary={dictionary}
                  />
                  <Chip
                    label={variant.stock > 0 ? copy.available : copy.soldOut}
                    color={variant.stock > 0 ? "success" : "default"}
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  />
                  {variant.stock > 0 ? (
                    <Typography variant="body2">
                      {copy.stock.replace("{count}", String(variant.stock))}
                    </Typography>
                  ) : null}
                  <Typography variant="caption" color="text.secondary">
                    {copy.sku}: {variant.sku}
                  </Typography>
                </Stack>
              ) : (
                <Alert severity="info">
                  {complete ? copy.invalidCombination : copy.partialSelection}
                </Alert>
              )}
            </Box>
            {product.options.length ? (
              <Stack
                component="section"
                spacing={2}
                aria-label={copy.chooseVariant}
              >
                <Typography component="h2" variant="h6">
                  {copy.chooseVariant}
                </Typography>
                {product.options.map((option) => (
                  <FormControl key={option.id} fullWidth>
                    <InputLabel id={`option-label-${option.id}`}>
                      {option.name}
                    </InputLabel>
                    <Select
                      labelId={`option-label-${option.id}`}
                      label={option.name}
                      value={selected[option.id] ?? ""}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = { ...current };
                          if (event.target.value)
                            next[option.id] = event.target.value;
                          else delete next[option.id];
                          return next;
                        })
                      }
                    >
                      <MenuItem value="">{copy.chooseValue}</MenuItem>
                      {option.values.map((value) => (
                        <MenuItem
                          key={value.id}
                          value={value.id}
                          disabled={
                            !canSelectOptionValue(
                              product.variants,
                              selected,
                              option.id,
                              value.id,
                            )
                          }
                        >
                          {value.value}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
                <Button
                  onClick={() => setSelected({})}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {copy.resetSelection}
                </Button>
              </Stack>
            ) : null}
            {preview ? (
              <Button variant="contained" disabled>
                {dictionary.admin.products.publication.buyDisabled}
              </Button>
            ) : (
              <AddToCart
                key={variant?.id ?? "unresolved"}
                variant={variant}
                dictionary={dictionary}
              />
            )}
            <Divider />
            <Typography component="h2" variant="h6">
              {copy.description}
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {product.longDescription ??
                product.shortDescription ??
                product.name}
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {product.categories.map((category) =>
                preview ? (
                  <Chip
                    key={category.id}
                    label={category.name}
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    key={category.id}
                    component={Link}
                    href={`/categorias/${category.slug}`}
                    label={category.name}
                    clickable
                    variant="outlined"
                  />
                ),
              )}
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
