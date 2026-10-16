"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { AdminCategoryParentOptionDto } from "@/domains/admin/categories/types/api_responses";
import type {
  AdminProductOptionParams,
  AdminProductUpsertParams,
} from "@/domains/admin/products/types/api_params";
import {
  ADMIN_PRODUCT_STATUS,
  type AdminProductDetailDto,
  type AdminProductUpsertStatus,
} from "@/domains/admin/products/types/product_dto";
import {
  AddOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  DeleteOutline,
} from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";

interface EditableOptionValue {
  id?: string;
  key: string;
  value: string;
}

interface EditableOption {
  id?: string;
  key: string;
  name: string;
  values: EditableOptionValue[];
}

interface ProductFormState {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  brand: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  status: AdminProductUpsertStatus;
  categoryIds: string[];
  primaryCategoryId: string;
  options: EditableOption[];
}

let clientKeySequence = 0;

function createClientKey(prefix: string): string {
  clientKeySequence += 1;
  return `${prefix}-${clientKeySequence}`;
}

function createEmptyState(): ProductFormState {
  return {
    id: "",
    name: "",
    slug: "",
    shortDescription: "",
    longDescription: "",
    brand: "",
    seoTitle: "",
    seoDescription: "",
    featured: false,
    status: ADMIN_PRODUCT_STATUS.draft,
    categoryIds: [],
    primaryCategoryId: "",
    options: [],
  };
}

interface ProductFormDialogProps {
  dictionary: Dictionary;
  open: boolean;
  product: AdminProductDetailDto | null;
  categoryOptions: AdminCategoryParentOptionDto[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (
    payload: AdminProductUpsertParams,
    productId: string | null,
  ) => void;
}

function createProductSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

function toNullableTrimmedValue(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function createInitialState(
  product: AdminProductDetailDto | null,
): ProductFormState {
  if (!product) {
    return createEmptyState();
  }

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    longDescription: product.longDescription ?? "",
    brand: product.brand ?? "",
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    featured: product.featured,
    status:
      product.status === ADMIN_PRODUCT_STATUS.archived
        ? ADMIN_PRODUCT_STATUS.inactive
        : product.status,
    categoryIds: product.categories.map((category) => category.id),
    primaryCategoryId: product.primaryCategory?.id ?? "",
    options: product.options.map((option) => ({
      id: option.id,
      key: option.id,
      name: option.name,
      values: option.values.map((value) => ({
        id: value.id,
        key: value.id,
        value: value.value,
      })),
    })),
  };
}

function toOptionPayload(
  options: EditableOption[],
): AdminProductOptionParams[] {
  return options.map((option, optionIndex) => ({
    ...(option.id ? { id: option.id } : {}),
    name: option.name.trim(),
    displayOrder: optionIndex,
    values: option.values.map((value, valueIndex) => ({
      ...(value.id ? { id: value.id } : {}),
      value: value.value.trim(),
      displayOrder: valueIndex,
    })),
  }));
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction;

  if (destination < 0 || destination >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const current = nextItems[index];
  const target = nextItems[destination];

  if (current === undefined || target === undefined) {
    return items;
  }

  nextItems[index] = target;
  nextItems[destination] = current;
  return nextItems;
}

export function ProductFormDialog({
  dictionary,
  open,
  product,
  categoryOptions,
  isSubmitting,
  onClose,
  onSubmit,
}: ProductFormDialogProps) {
  const [formState, setFormState] = useState<ProductFormState>(() =>
    createInitialState(product),
  );

  const categoryOptionsById = new Map(
    categoryOptions.map((category) => [category.id, category]),
  );
  for (const category of product?.categories ?? []) {
    categoryOptionsById.set(category.id, {
      id: category.id,
      name: category.name,
    });
  }
  const availableCategories = Array.from(categoryOptionsById.values());
  const selectedCategories = formState.categoryIds.flatMap((categoryId) => {
    const category = categoryOptionsById.get(categoryId);
    return category ? [category] : [];
  });
  const primaryCategoryOptions = selectedCategories;
  const primaryCategory =
    primaryCategoryOptions.find(
      (category) => category.id === formState.primaryCategoryId,
    ) ?? null;

  const submit = (): void => {
    const options = toOptionPayload(formState.options);

    if (
      options.some(
        (option) =>
          !option.name ||
          option.values.length === 0 ||
          option.values.some((value) => !value.value),
      )
    ) {
      return;
    }

    onSubmit(
      {
        name: formState.name.trim(),
        slug: formState.slug.trim(),
        shortDescription: toNullableTrimmedValue(formState.shortDescription),
        longDescription: toNullableTrimmedValue(formState.longDescription),
        brand: toNullableTrimmedValue(formState.brand),
        seoTitle: toNullableTrimmedValue(formState.seoTitle),
        seoDescription: toNullableTrimmedValue(formState.seoDescription),
        featured: formState.featured,
        status: formState.status,
        categoryIds: formState.categoryIds,
        primaryCategoryId: formState.primaryCategoryId,
        ...(!product?.optionsLocked ? { options } : {}),
      },
      formState.id || null,
    );
  };

  const optionCopy = dictionary.admin.products.options;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {product
          ? dictionary.admin.products.form.editTitle
          : dictionary.admin.products.form.createTitle}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={dictionary.admin.products.form.name}
            size="small"
            value={formState.name}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                name: event.target.value,
                slug: createProductSlug(event.target.value),
              }))
            }
          />
          <TextField
            disabled
            helperText={dictionary.admin.products.formHelp.slug}
            label={dictionary.admin.products.form.slug}
            size="small"
            value={formState.slug}
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              label={dictionary.admin.products.form.shortDescription}
              size="small"
              value={formState.shortDescription}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label={dictionary.admin.products.form.brand}
              size="small"
              value={formState.brand}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  brand: event.target.value,
                }))
              }
            />
          </Stack>
          <TextField
            label={dictionary.admin.products.form.longDescription}
            size="small"
            multiline
            minRows={3}
            value={formState.longDescription}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                longDescription: event.target.value,
              }))
            }
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="admin-product-status-label">
                {dictionary.admin.products.form.status}
              </InputLabel>
              <Select
                labelId="admin-product-status-label"
                value={formState.status}
                label={dictionary.admin.products.form.status}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === ADMIN_PRODUCT_STATUS.draft ||
                    value === ADMIN_PRODUCT_STATUS.active ||
                    value === ADMIN_PRODUCT_STATUS.inactive
                  ) {
                    setFormState((current) => ({ ...current, status: value }));
                  }
                }}
              >
                <MenuItem value={ADMIN_PRODUCT_STATUS.draft}>
                  {dictionary.admin.products.status.draft}
                </MenuItem>
                <MenuItem value={ADMIN_PRODUCT_STATUS.active}>
                  {dictionary.admin.products.status.active}
                </MenuItem>
                <MenuItem value={ADMIN_PRODUCT_STATUS.inactive}>
                  {dictionary.admin.products.status.inactive}
                </MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formState.featured}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      featured: event.target.checked,
                    }))
                  }
                />
              }
              label={dictionary.admin.products.form.featured}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <Autocomplete
              multiple
              fullWidth
              options={availableCategories}
              value={selectedCategories}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_event, categories) =>
                setFormState((current) => {
                  const categoryIds = categories.map((category) => category.id);
                  return {
                    ...current,
                    categoryIds,
                    primaryCategoryId: categoryIds.includes(
                      current.primaryCategoryId,
                    )
                      ? current.primaryCategoryId
                      : "",
                  };
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={dictionary.admin.products.form.categories}
                  helperText={dictionary.admin.products.formHelp.categories}
                />
              )}
            />
            <Autocomplete
              fullWidth
              options={primaryCategoryOptions}
              value={primaryCategory}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_event, category) =>
                setFormState((current) => ({
                  ...current,
                  primaryCategoryId: category?.id ?? "",
                }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  label={dictionary.admin.products.form.primaryCategory}
                  helperText={
                    dictionary.admin.products.formHelp.primaryCategory
                  }
                />
              )}
            />
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              {dictionary.admin.products.form.options}
            </Typography>
            {product?.optionsLocked ? (
              <Alert severity="info">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {optionCopy.locked}
                </Typography>
                <Stack spacing={1}>
                  {formState.options.map((option) => (
                    <Box key={option.key}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {option.name}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        {option.values.map((value) => (
                          <Chip
                            key={value.key}
                            size="small"
                            label={value.value}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {formState.options.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {optionCopy.empty}
                  </Typography>
                ) : null}
                {formState.options.map((option, optionIndex) => (
                  <Paper key={option.key} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ sm: "center" }}
                      >
                        <TextField
                          fullWidth
                          size="small"
                          label={optionCopy.name}
                          value={option.name}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              options: current.options.map((item) =>
                                item.key === option.key
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <Stack direction="row">
                          <IconButton
                            aria-label={optionCopy.moveUp}
                            disabled={optionIndex === 0}
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                options: moveItem(
                                  current.options,
                                  optionIndex,
                                  -1,
                                ),
                              }))
                            }
                          >
                            <ArrowUpwardOutlined />
                          </IconButton>
                          <IconButton
                            aria-label={optionCopy.moveDown}
                            disabled={
                              optionIndex === formState.options.length - 1
                            }
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                options: moveItem(
                                  current.options,
                                  optionIndex,
                                  1,
                                ),
                              }))
                            }
                          >
                            <ArrowDownwardOutlined />
                          </IconButton>
                          <IconButton
                            aria-label={optionCopy.removeOption}
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                options: current.options.filter(
                                  (item) => item.key !== option.key,
                                ),
                              }))
                            }
                          >
                            <DeleteOutline />
                          </IconButton>
                        </Stack>
                      </Stack>
                      {option.values.map((value, valueIndex) => (
                        <Stack
                          key={value.key}
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <TextField
                            fullWidth
                            size="small"
                            label={optionCopy.value}
                            value={value.value}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                options: current.options.map((item) =>
                                  item.key === option.key
                                    ? {
                                        ...item,
                                        values: item.values.map((candidate) =>
                                          candidate.key === value.key
                                            ? {
                                                ...candidate,
                                                value: event.target.value,
                                              }
                                            : candidate,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          />
                          <IconButton
                            aria-label={optionCopy.moveValueUp}
                            disabled={valueIndex === 0}
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                options: current.options.map((item) =>
                                  item.key === option.key
                                    ? {
                                        ...item,
                                        values: moveItem(
                                          item.values,
                                          valueIndex,
                                          -1,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          >
                            <ArrowUpwardOutlined />
                          </IconButton>
                          <IconButton
                            aria-label={optionCopy.moveValueDown}
                            disabled={valueIndex === option.values.length - 1}
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                options: current.options.map((item) =>
                                  item.key === option.key
                                    ? {
                                        ...item,
                                        values: moveItem(
                                          item.values,
                                          valueIndex,
                                          1,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          >
                            <ArrowDownwardOutlined />
                          </IconButton>
                          <IconButton
                            aria-label={optionCopy.removeValue}
                            onClick={() =>
                              setFormState((current) => ({
                                ...current,
                                options: current.options.map((item) =>
                                  item.key === option.key
                                    ? {
                                        ...item,
                                        values: item.values.filter(
                                          (candidate) =>
                                            candidate.key !== value.key,
                                        ),
                                      }
                                    : item,
                                ),
                              }))
                            }
                          >
                            <DeleteOutline />
                          </IconButton>
                        </Stack>
                      ))}
                      <Button
                        size="small"
                        startIcon={<AddOutlined />}
                        onClick={() =>
                          setFormState((current) => ({
                            ...current,
                            options: current.options.map((item) =>
                              item.key === option.key
                                ? {
                                    ...item,
                                    values: [
                                      ...item.values,
                                      {
                                        key: createClientKey("value"),
                                        value: "",
                                      },
                                    ],
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        {optionCopy.addValue}
                      </Button>
                    </Stack>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddOutlined />}
                  onClick={() =>
                    setFormState((current) => ({
                      ...current,
                      options: [
                        ...current.options,
                        {
                          key: createClientKey("option"),
                          name: "",
                          values: [
                            { key: createClientKey("value"), value: "" },
                          ],
                        },
                      ],
                    }))
                  }
                >
                  {optionCopy.addOption}
                </Button>
              </Stack>
            )}
          </Box>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              label={dictionary.admin.products.form.seoTitle}
              size="small"
              value={formState.seoTitle}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  seoTitle: event.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label={dictionary.admin.products.form.seoDescription}
              size="small"
              value={formState.seoDescription}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  seoDescription: event.target.value,
                }))
              }
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {dictionary.admin.products.form.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={
            isSubmitting ||
            !formState.name.trim() ||
            !formState.slug.trim() ||
            formState.categoryIds.length === 0 ||
            !formState.primaryCategoryId
          }
          onClick={submit}
        >
          {dictionary.admin.products.form.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
