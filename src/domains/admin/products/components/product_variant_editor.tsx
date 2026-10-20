"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { AdminEditorState } from "@/domains/admin/components/admin_editor_surface";
import type {
  AdminVariantLifecycleParams,
  AdminVariantMutationApiResponse,
  AdminVariantUpsertParams,
} from "@/domains/admin/products/types/api_params";
import type {
  AdminProductOptionDto,
  AdminProductVariantDto,
} from "@/domains/admin/products/types/product_dto";
import {
  Alert,
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
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useEffect, useState } from "react";

interface VariantFormState {
  variantId: string;
  sku: string;
  priceCents: string;
  compareAtPriceCents: string;
  stock: string;
  active: boolean;
  isDefault: boolean;
  displayOrder: string;
  weightGrams: string;
  widthMm: string;
  heightMm: string;
  lengthMm: string;
  optionValueByOptionId: Record<string, string>;
}

function createEmptyVariantForm(): VariantFormState {
  return {
    variantId: "",
    sku: "",
    priceCents: "0",
    compareAtPriceCents: "",
    stock: "0",
    active: true,
    isDefault: false,
    displayOrder: "0",
    weightGrams: "",
    widthMm: "",
    heightMm: "",
    lengthMm: "",
    optionValueByOptionId: {},
  };
}

interface ProductVariantEditorProps {
  onStateChange?: (state: AdminEditorState) => void;
  onRequestChange?: (action: () => void) => void;
  dictionary: Dictionary;
  productId: string;
  productOptions: AdminProductOptionDto[];
  initialVariants?: AdminProductVariantDto[];
  onVariantsChange?: (variants: AdminProductVariantDto[]) => void;
}

function parseNullableNumber(value: string): number | null {
  const trimmedValue = value.trim();
  return trimmedValue ? Number(trimmedValue) : null;
}

function parseRequiredNumber(value: string): number {
  return Number(value.trim());
}

function toVariantPayload(
  formState: VariantFormState,
  productOptions: AdminProductOptionDto[],
): AdminVariantUpsertParams {
  return {
    sku: formState.sku.trim(),
    priceCents: parseRequiredNumber(formState.priceCents),
    compareAtPriceCents: parseNullableNumber(formState.compareAtPriceCents),
    stock: parseRequiredNumber(formState.stock),
    active: formState.active,
    isDefault: formState.isDefault,
    displayOrder: parseRequiredNumber(formState.displayOrder),
    weightGrams: parseNullableNumber(formState.weightGrams),
    widthMm: parseNullableNumber(formState.widthMm),
    heightMm: parseNullableNumber(formState.heightMm),
    lengthMm: parseNullableNumber(formState.lengthMm),
    optionValueIds: productOptions.flatMap((option) => {
      const valueId = formState.optionValueByOptionId[option.id];
      return valueId ? [valueId] : [];
    }),
  };
}

function createVariantForm(variant: AdminProductVariantDto): VariantFormState {
  return {
    variantId: variant.id,
    sku: variant.sku,
    priceCents: String(variant.priceCents),
    compareAtPriceCents:
      variant.compareAtPriceCents === null
        ? ""
        : String(variant.compareAtPriceCents),
    stock: String(variant.stock),
    active: variant.active,
    isDefault: variant.isDefault,
    displayOrder: String(variant.displayOrder),
    weightGrams: variant.weightGrams?.toString() ?? "",
    widthMm: variant.widthMm?.toString() ?? "",
    heightMm: variant.heightMm?.toString() ?? "",
    lengthMm: variant.lengthMm?.toString() ?? "",
    optionValueByOptionId: Object.fromEntries(
      variant.optionValues.map((selection) => [
        selection.optionId,
        selection.optionValueId,
      ]),
    ),
  };
}

function isVariantSellable(variant: AdminProductVariantDto): boolean {
  return variant.active && !variant.inTrash && variant.stock > 0;
}

export function ProductVariantEditor({
  onStateChange,
  onRequestChange,
  dictionary,
  productId,
  productOptions,
  initialVariants = [],
  onVariantsChange,
}: ProductVariantEditorProps) {
  const { cancellableApi } = useCancellableApiContext();
  const [variants, setVariants] =
    useState<AdminProductVariantDto[]>(initialVariants);
  const [formState, setFormState] = useState<VariantFormState>(() =>
    createEmptyVariantForm(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [onlyTrash, setOnlyTrash] = useState(false);
  const [lifecycleVariant, setLifecycleVariant] =
    useState<AdminProductVariantDto | null>(null);
  const original = variants.find(
    (variant) => variant.id === formState.variantId,
  );
  const dirty =
    JSON.stringify(formState) !==
    JSON.stringify(
      original ? createVariantForm(original) : createEmptyVariantForm(),
    );
  useEffect(() => {
    onStateChange?.({ dirty, busy: isSubmitting });
  }, [dirty, isSubmitting, onStateChange]);
  const requestChange = (action: () => void) =>
    onRequestChange ? onRequestChange(action) : action();

  const setNextVariants = (nextVariants: AdminProductVariantDto[]): void => {
    setVariants(nextVariants);
    onVariantsChange?.(nextVariants);
  };

  const hasCompleteSelection = productOptions.every(
    (option) => formState.optionValueByOptionId[option.id],
  );

  const submitVariant = async (): Promise<void> => {
    if (!formState.sku.trim() || !hasCompleteSelection || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = toVariantPayload(formState, productOptions);
      const numbers = [
        payload.priceCents,
        payload.compareAtPriceCents,
        payload.stock,
        payload.displayOrder,
        payload.weightGrams,
        payload.widthMm,
        payload.heightMm,
        payload.lengthMm,
      ];
      if (
        numbers.some(
          (value) =>
            value !== null &&
            value !== undefined &&
            (!Number.isSafeInteger(value) || value < 0),
        )
      ) {
        enqueueSnackbar(
          dictionary.admin.products.feedback.invalid_variant_numbers,
          { variant: "error" },
        );
        return;
      }
      const response = formState.variantId
        ? await cancellableApi.patch<
            AdminVariantMutationApiResponse,
            AdminVariantUpsertParams & { variantId: string }
          >(
            `admin-products-variant-update-${formState.variantId}`,
            `/admin/products/${productId}/variants`,
            {
              ...payload,
              variantId: formState.variantId,
              expectedUpdatedAt: original?.updatedAt,
            },
          )
        : await cancellableApi.post<
            AdminVariantMutationApiResponse,
            AdminVariantUpsertParams
          >(
            `admin-products-variant-create-${productId}`,
            `/admin/products/${productId}/variants`,
            payload,
          );

      if (!response) {
        return;
      }

      setNextVariants(
        formState.variantId
          ? variants.map((variant) =>
              variant.id === response.variant.id ? response.variant : variant,
            )
          : [response.variant, ...variants],
      );
      setFormState(createEmptyVariantForm());
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      const feedbackMessages = dictionary.admin.products.feedback as Record<
        string,
        string
      >;
      enqueueSnackbar(
        (message ? feedbackMessages[message] : undefined) ??
          dictionary.admin.products.feedback.saveError,
        { variant: "error" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyLifecycle = async (): Promise<void> => {
    if (!lifecycleVariant || isSubmitting) return;
    setIsSubmitting(true);
    const action: AdminVariantLifecycleParams["action"] =
      lifecycleVariant.inTrash ? "restore" : "trash";
    try {
      const response = await cancellableApi.post<
        AdminVariantMutationApiResponse,
        Record<string, never>
      >(
        "admin-variant-" + action + "-" + lifecycleVariant.id,
        "/admin/products/" +
          productId +
          "/variants/" +
          lifecycleVariant.id +
          "/" +
          action,
        {},
      );
      if (response) {
        setNextVariants(
          variants.map((variant) =>
            variant.id === response.variant.id ? response.variant : variant,
          ),
        );
        setFormState(createEmptyVariantForm());
        setLifecycleVariant(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const feedback = dictionary.admin.products.feedback;
      enqueueSnackbar(
        message === "record_not_found"
          ? feedback.record_not_found
          : feedback.saveError,
        { variant: "error" },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper
      component="fieldset"
      disabled={isSubmitting}
      variant="outlined"
      sx={{
        p: 2,
        m: 0,
        minWidth: 0,
        borderColor: "divider",
        boxShadow: "none",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {dictionary.admin.products.variants.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dictionary.admin.products.variants.description}
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={onlyTrash}
              onChange={(event) => {
                const checked = event.target.checked;
                requestChange(() => {
                  setOnlyTrash(checked);
                  setFormState(createEmptyVariantForm());
                });
              }}
            />
          }
          label={dictionary.admin.products.variants.onlyTrash}
        />
        <Stack spacing={1.25}>
          {variants.filter((variant) => variant.inTrash === onlyTrash)
            .length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {dictionary.admin.products.variants.empty}
            </Typography>
          ) : null}
          {variants
            .filter((variant) => variant.inTrash === onlyTrash)
            .map((variant) => {
              const sellable = isVariantSellable(variant);
              return (
                <Stack
                  key={variant.id}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {variant.sku}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {variant.optionValues
                        .map(
                          (selection) =>
                            `${selection.optionName}: ${selection.optionValue}`,
                        )
                        .join(" · ")}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                    >
                      {dictionary.admin.products.variants.stock}:{" "}
                      {variant.stock}
                    </Typography>
                  </Box>
                  {variant.stock === 0 ? (
                    <Chip
                      size="small"
                      color="warning"
                      label={dictionary.admin.products.variants.stockZeroLabel}
                    />
                  ) : null}
                  <Chip
                    size="small"
                    color={sellable ? "success" : "default"}
                    label={
                      sellable
                        ? dictionary.admin.products.variants.sellable
                        : dictionary.admin.products.variants.notSellable
                    }
                  />
                  <Button
                    size="small"
                    disabled={variant.inTrash || isSubmitting}
                    onClick={() =>
                      requestChange(() =>
                        setFormState(createVariantForm(variant)),
                      )
                    }
                  >
                    {dictionary.admin.products.variants.edit}
                  </Button>
                  <Button
                    disabled={isSubmitting}
                    size="small"
                    onClick={() =>
                      requestChange(() => {
                        setFormState(createEmptyVariantForm());
                        setLifecycleVariant(variant);
                      })
                    }
                  >
                    {variant.inTrash
                      ? dictionary.admin.products.variants.restore
                      : dictionary.admin.products.variants.trash}
                  </Button>
                  {variant.stock === 0 ? (
                    <Alert severity="warning" sx={{ py: 0 }}>
                      {dictionary.admin.products.variants.stockZeroWarning}
                    </Alert>
                  ) : null}
                </Stack>
              );
            })}
        </Stack>

        {!onlyTrash ? (
          <Stack spacing={1.5}>
            <TextField
              label={dictionary.admin.products.variants.sku}
              size="small"
              value={formState.sku}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  sku: event.target.value,
                }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                fullWidth
                label={dictionary.admin.products.variants.priceCents}
                size="small"
                value={formState.priceCents}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    priceCents: event.target.value,
                  }))
                }
              />
              <TextField
                fullWidth
                label={dictionary.admin.products.variants.compareAtPriceCents}
                size="small"
                value={formState.compareAtPriceCents}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    compareAtPriceCents: event.target.value,
                  }))
                }
              />
              <TextField
                fullWidth
                label={dictionary.admin.products.variants.stock}
                size="small"
                value={formState.stock}
                disabled={!!formState.variantId}
                helperText={
                  formState.variantId
                    ? dictionary.admin.products.feedback.inventory_use_movements
                    : undefined
                }
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    stock: event.target.value,
                  }))
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {productOptions.map((option) => (
                <FormControl key={option.id} fullWidth size="small">
                  <InputLabel id={`variant-option-${option.id}`}>
                    {option.name}
                  </InputLabel>
                  <Select
                    labelId={`variant-option-${option.id}`}
                    label={option.name}
                    value={formState.optionValueByOptionId[option.id] ?? ""}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        optionValueByOptionId: {
                          ...current.optionValueByOptionId,
                          [option.id]: event.target.value,
                        },
                      }))
                    }
                  >
                    {option.values.map((value) => (
                      <MenuItem key={value.id} value={value.id}>
                        {value.value}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                fullWidth
                label={dictionary.admin.products.variants.displayOrder}
                size="small"
                value={formState.displayOrder}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    displayOrder: event.target.value,
                  }))
                }
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              {(
                ["weightGrams", "widthMm", "heightMm", "lengthMm"] as const
              ).map((field) => (
                <TextField
                  key={field}
                  fullWidth
                  type="number"
                  label={dictionary.admin.products.variants[field]}
                  size="small"
                  value={formState[field]}
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              ))}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formState.active}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        active: event.target.checked,
                        isDefault: event.target.checked
                          ? current.isDefault
                          : false,
                      }))
                    }
                  />
                }
                label={dictionary.admin.products.variants.active}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={!formState.active}
                    checked={formState.isDefault}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        isDefault: event.target.checked,
                      }))
                    }
                  />
                }
                label={dictionary.admin.products.variants.isDefault}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                disabled={
                  isSubmitting || !formState.sku.trim() || !hasCompleteSelection
                }
                onClick={() => void submitVariant()}
              >
                {formState.variantId
                  ? dictionary.admin.products.variants.update
                  : dictionary.admin.products.variants.create}
              </Button>
              {formState.variantId ? (
                <Button
                  disabled={isSubmitting}
                  onClick={() =>
                    requestChange(() => setFormState(createEmptyVariantForm()))
                  }
                >
                  {dictionary.admin.products.variants.cancelEdit}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        ) : null}
      </Stack>
      <Dialog
        open={lifecycleVariant !== null}
        onClose={() => {
          if (!isSubmitting) setLifecycleVariant(null);
        }}
      >
        <DialogTitle>
          {lifecycleVariant?.inTrash
            ? dictionary.admin.products.variants.restore
            : dictionary.admin.products.variants.trash}
        </DialogTitle>
        <DialogContent>
          {lifecycleVariant?.inTrash
            ? dictionary.admin.products.variants.restoreConfirm
            : dictionary.admin.products.variants.trashConfirm}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isSubmitting}
            onClick={() => setLifecycleVariant(null)}
          >
            {dictionary.admin.products.variants.cancel}
          </Button>
          <Button disabled={isSubmitting} onClick={() => void applyLifecycle()}>
            {dictionary.admin.products.variants.confirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
