"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { ProductDetail } from "@/domains/storefront/components/product_detail";
import type { StorefrontProduct } from "@/domains/storefront/types/catalog";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useState } from "react";

export function ProductPreviewFrame({
  dictionary,
  productId,
  product,
  backHref,
}: {
  dictionary: Dictionary;
  productId: string;
  product: StorefrontProduct | null;
  backHref: string;
}) {
  const copy = dictionary.admin.products.publication;
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");
  return (
    <Stack
      spacing={2}
      sx={{ p: { xs: 2, md: 3 }, minHeight: "100dvh", minWidth: 0 }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Stack spacing={0.5}>
          <Typography component="h1" variant="h5">
            {copy.previewTitle}
          </Typography>
          <Typography variant="body2">{copy.previewDescription}</Typography>
        </Stack>
        <Button variant="outlined" component="a" href={backHref}>
          {copy.previewBack}
        </Button>
      </Stack>
      <Alert severity="info">{copy.savedOnly}</Alert>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
          variant={mode === "mobile" ? "contained" : "outlined"}
          aria-pressed={mode === "mobile"}
          onClick={() => setMode("mobile")}
        >
          {copy.mobile}
        </Button>
        <Button
          variant={mode === "desktop" ? "contained" : "outlined"}
          aria-pressed={mode === "desktop"}
          onClick={() => setMode("desktop")}
        >
          {copy.desktop}
        </Button>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          {copy.reloadPreview}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {copy.previewSizeHelp}
      </Typography>
      <Box
        sx={{
          overflowX: "auto",
          minWidth: 0,
          flexGrow: 1,
          bgcolor: "action.hover",
          p: 1,
        }}
      >
        <Box
          role="region"
          aria-label={copy.frameTitle}
          sx={{
            width: mode === "mobile" ? 390 : 1200,
            maxWidth: mode === "mobile" ? "100%" : "none",
            mx: "auto",
            py: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          {product ? (
            <ProductDetail
              key={productId}
              product={product}
              dictionary={dictionary}
              preview
            />
          ) : (
            <Alert severity="warning">{copy.previewUnavailable}</Alert>
          )}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {copy.previewStorage}
      </Typography>
    </Stack>
  );
}
