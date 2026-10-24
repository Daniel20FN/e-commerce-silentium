"use client";

import Close from "@mui/icons-material/Close";
import Search from "@mui/icons-material/Search";
import Tune from "@mui/icons-material/Tune";
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import {
  activeCatalogFilters,
  catalogQueryString,
} from "../services/catalog_filters";
import type { CatalogDictionary } from "../services/storefront_dictionary";
import type { CatalogFilters } from "../types/api_params";
import type { StorefrontCategory } from "../types/catalog";

type Props = {
  dictionary: CatalogDictionary;
  filters: CatalogFilters;
  categories: Pick<StorefrontCategory, "id" | "name" | "slug" | "parentId">[];
  base: string;
  scoped: boolean;
};

function FilterFields({
  dictionary,
  filters,
  categories,
  base,
  scoped,
  prefix,
}: Props & { prefix: string }) {
  const copy = dictionary.storefront.filters;
  const options = categories.map((category) => {
    const parent = categories.find((item) => item.id === category.parentId);
    return {
      slug: category.slug,
      label: parent ? `${parent.name} / ${category.name}` : category.name,
    };
  });
  return (
    <Stack component="form" action={base} method="get" spacing={2.5}>
      <input type="hidden" name="orden" value={filters.sort} />
      <TextField
        id={`${prefix}-search`}
        name="q"
        label={copy.search}
        placeholder={copy.placeholder}
        defaultValue={filters.q}
        size="small"
        slotProps={{
          htmlInput: { maxLength: 100 },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <FormControl fullWidth size="small">
        <InputLabel shrink htmlFor={`${prefix}-category`}>
          {copy.category}
        </InputLabel>
        <Select
          native
          notched
          name="categoria"
          defaultValue={filters.category}
          label={copy.category}
          inputProps={{ id: `${prefix}-category` }}
        >
          <option value="">
            {scoped ? copy.currentCategory : copy.allCategories}
          </option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormControl>
      <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Typography component="legend" variant="subtitle2" sx={{ mb: 1.5 }}>
          {copy.price}
        </Typography>
        <Stack spacing={2}>
          <TextField
            id={`${prefix}-min`}
            name="min"
            label={copy.min}
            type="number"
            defaultValue={filters.minPrice}
            size="small"
            slotProps={{
              htmlInput: {
                min: 0,
                max: 21474836.47,
                step: "0.01",
                inputMode: "decimal",
              },
            }}
          />
          <TextField
            id={`${prefix}-max`}
            name="max"
            label={copy.max}
            type="number"
            defaultValue={filters.maxPrice}
            size="small"
            slotProps={{
              htmlInput: {
                min: 0,
                max: 21474836.47,
                step: "0.01",
                inputMode: "decimal",
              },
            }}
          />
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          {copy.priceNote}
        </Typography>
      </Box>
      <Stack>
        <FormControlLabel
          control={
            <Checkbox
              name="disponibles"
              value="1"
              defaultChecked={filters.available}
            />
          }
          label={copy.available}
        />
        <FormControlLabel
          control={
            <Checkbox
              name="ofertas"
              value="1"
              defaultChecked={filters.offers}
            />
          }
          label={copy.offers}
        />
      </Stack>
      <Button type="submit" variant="contained">
        {copy.apply}
      </Button>
      <Button component="a" href={base} variant="outlined">
        {copy.clear}
      </Button>
    </Stack>
  );
}

export function CatalogFilterSidebar(props: Props) {
  return (
    <Box
      component="aside"
      aria-labelledby="catalog-filter-title"
      sx={{
        display: { xs: "none", md: "block" },
        width: 248,
        flexShrink: 0,
        alignSelf: "start",
        position: "sticky",
        top: 100,
        maxHeight: "calc(100dvh - 120px)",
        overflowY: "auto",
        pr: 1,
      }}
    >
      <Typography
        id="catalog-filter-title"
        component="h2"
        variant="h6"
        sx={{ mb: 3 }}
      >
        {props.dictionary.storefront.filters.title}
      </Typography>
      <FilterFields {...props} prefix="desktop" />
    </Box>
  );
}

export function CatalogMobileFilters(props: Props) {
  const [open, setOpen] = useState(false);
  const copy = props.dictionary.storefront.filters;
  const count = activeCatalogFilters(props.filters);
  return (
    <Box sx={{ display: { xs: "block", md: "none" }, mb: 3 }}>
      <Stack
        component="form"
        action={props.base}
        method="get"
        direction="row"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <HiddenFilters filters={props.filters} except="q" />
        <TextField
          name="q"
          label={copy.search}
          defaultValue={props.filters.q}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <Button type="submit" variant="outlined" aria-label={copy.search}>
          <Search />
        </Button>
      </Stack>
      <Button
        onClick={() => setOpen(true)}
        variant="outlined"
        startIcon={<Tune />}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {copy.open}
        {count ? ` (${count})` : ""}
      </Button>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": "mobile-filter-title",
            sx: { width: "min(100%, 360px)", p: 3 },
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Typography id="mobile-filter-title" component="h2" variant="h6">
            {copy.title}
          </Typography>
          <IconButton onClick={() => setOpen(false)} aria-label={copy.close}>
            <Close />
          </IconButton>
        </Stack>
        <FilterFields {...props} prefix="mobile" />
      </Drawer>
    </Box>
  );
}

export function HiddenFilters({
  filters,
  except,
}: {
  filters: CatalogFilters;
  except: "q" | "orden";
}) {
  const params = new URLSearchParams(catalogQueryString(filters));
  return [...params]
    .filter(([key]) => key !== except)
    .map(([key, value]) => (
      <input key={key} type="hidden" name={key} value={value} />
    ));
}

export function CatalogSortControl({
  filters,
  base,
  dictionary,
}: Pick<Props, "filters" | "base" | "dictionary">) {
  const copy = dictionary.storefront.filters;
  return (
    <Stack
      component="form"
      action={base}
      method="get"
      direction="row"
      spacing={1}
      sx={{ width: { xs: "100%", sm: "auto" } }}
    >
      <HiddenFilters filters={filters} except="orden" />
      <FormControl size="small" sx={{ minWidth: 0, flex: 1 }}>
        <InputLabel shrink htmlFor="catalog-order">
          {copy.sort}
        </InputLabel>
        <Select
          native
          notched
          name="orden"
          defaultValue={filters.sort}
          label={copy.sort}
          inputProps={{ id: "catalog-order" }}
        >
          <option value="recommended">{copy.recommended}</option>
          <option value="price_asc">{copy.priceAsc}</option>
          <option value="price_desc">{copy.priceDesc}</option>
          <option value="name_asc">{copy.nameAsc}</option>
          <option value="name_desc">{copy.nameDesc}</option>
        </Select>
      </FormControl>
      <Button type="submit" variant="outlined">
        {copy.applySort}
      </Button>
    </Stack>
  );
}
