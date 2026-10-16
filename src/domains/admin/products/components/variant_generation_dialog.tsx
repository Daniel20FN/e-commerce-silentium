"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type {
  AdminVariantGenerationConfirmParams,
  AdminVariantUpsertParams,
} from "@/domains/admin/products/types/api_params";
import type {
  AdminProductOptionDto,
  AdminProductVariantDto,
} from "@/domains/admin/products/types/product_dto";
import type { ApiResponse } from "@/types/api-service/api_response";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useState } from "react";

interface VariantGenerationCombination {
  optionValueIds: string[];
  label: string;
}

interface VariantGenerationPreviewResult {
  combinations: VariantGenerationCombination[];
  duplicateCombinations: VariantGenerationCombination[];
}

interface VariantGenerationConfirmResult {
  created: AdminProductVariantDto[];
  skippedDuplicateCombinationKeys: string[];
}

type VariantGenerationPreviewApiResponse =
  ApiResponse<VariantGenerationPreviewResult>;
type VariantGenerationConfirmApiResponse =
  ApiResponse<VariantGenerationConfirmResult>;

interface VariantGenerationDialogProps {
  dictionary: Dictionary;
  open: boolean;
  productId: string | null;
  productOptions: AdminProductOptionDto[];
  onClose: () => void;
  onGenerated: (variants: AdminProductVariantDto[]) => void;
}

function parseNumber(value: string): number {
  return Number(value.trim());
}

function createGeneratedVariantPayload(
  combination: VariantGenerationCombination,
  index: number,
  skuPrefix: string,
  priceCents: number,
  stock: number,
): AdminVariantUpsertParams {
  return {
    sku: `${skuPrefix.trim()}-${index + 1}`,
    priceCents,
    compareAtPriceCents: null,
    stock,
    active: true,
    isDefault: index === 0,
    displayOrder: index,
    weightGrams: null,
    widthMm: null,
    heightMm: null,
    lengthMm: null,
    optionValueIds: combination.optionValueIds,
  };
}

export function VariantGenerationDialog({
  dictionary,
  open,
  productId,
  productOptions,
  onClose,
  onGenerated,
}: VariantGenerationDialogProps) {
  const { cancellableApi } = useCancellableApiContext();
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() =>
    productOptions.map((option) => option.id),
  );
  const [skuPrefix, setSkuPrefix] = useState("");
  const [priceCents, setPriceCents] = useState("0");
  const [stock, setStock] = useState("0");
  const [preview, setPreview] = useState<VariantGenerationPreviewResult | null>(
    null,
  );

  const [isPending, setIsPending] = useState(false);
  const reportError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : "";
    const feedback = Object.entries(dictionary.admin.products.feedback).find(
      ([key]) => key === message,
    )?.[1];
    enqueueSnackbar(feedback ?? dictionary.admin.products.feedback.saveError, {
      variant: "error",
    });
  };

  const requestPreview = async (): Promise<void> => {
    if (!productId || isPending) {
      return;
    }

    setIsPending(true);
    setPreview(null);
    try {
      const response = await cancellableApi.post<
        VariantGenerationPreviewApiResponse,
        { optionIds: string[] }
      >(
        `admin-products-generate-preview-${productId}`,
        `/admin/products/${productId}/generate-variants`,
        {
          optionIds: selectedOptionIds,
        },
      );

      if (response) {
        setPreview(response);
      }
    } catch (error) {
      reportError(error);
    } finally {
      setIsPending(false);
    }
  };

  const confirmGeneration = async (): Promise<void> => {
    if (!productId || !preview || isPending) {
      return;
    }

    if (
      [parseNumber(priceCents), parseNumber(stock)].some(
        (number) => !Number.isSafeInteger(number) || number < 0,
      )
    ) {
      enqueueSnackbar(
        dictionary.admin.products.feedback.invalid_variant_numbers,
        { variant: "error" },
      );
      return;
    }
    setIsPending(true);
    try {
      const variants = preview.combinations.map((combination, index) =>
        createGeneratedVariantPayload(
          combination,
          index,
          skuPrefix,
          parseNumber(priceCents),
          parseNumber(stock),
        ),
      );

      const response = await cancellableApi.put<
        VariantGenerationConfirmApiResponse,
        AdminVariantGenerationConfirmParams
      >(
        `admin-products-generate-confirm-${productId}`,
        `/admin/products/${productId}/generate-variants`,
        {
          variants,
        },
      );

      if (!response) {
        return;
      }

      onGenerated(response.created);
      enqueueSnackbar(
        dictionary.admin.products.generation.confirmed.replace(
          "{count}",
          String(response.created.length),
        ),
        { variant: "success" },
      );
      onClose();
    } catch (error) {
      reportError(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isPending) onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{dictionary.admin.products.generation.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">
              {dictionary.admin.products.generation.options}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dictionary.admin.products.generation.optionsHelp}
            </Typography>
            <FormGroup row>
              {productOptions.map((option) => (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      disabled={isPending}
                      checked={selectedOptionIds.includes(option.id)}
                      onChange={(event) => {
                        setPreview(null);
                        setSelectedOptionIds((current) =>
                          event.target.checked
                            ? [...current, option.id]
                            : current.filter((id) => id !== option.id),
                        );
                      }}
                    />
                  }
                  label={option.name}
                />
              ))}
            </FormGroup>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              fullWidth
              label={dictionary.admin.products.generation.skuPrefix}
              size="small"
              value={skuPrefix}
              onChange={(event) => setSkuPrefix(event.target.value)}
            />
            <TextField
              fullWidth
              label={dictionary.admin.products.generation.priceCents}
              size="small"
              value={priceCents}
              onChange={(event) => setPriceCents(event.target.value)}
            />
            <TextField
              fullWidth
              label={dictionary.admin.products.generation.stock}
              size="small"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
            />
          </Stack>
          <Button
            variant="outlined"
            disabled={isPending || !productId || selectedOptionIds.length === 0}
            onClick={() => void requestPreview()}
          >
            {dictionary.admin.products.generation.preview}
          </Button>

          {preview ? (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {dictionary.admin.products.generation.previewTitle}
              </Typography>
              {preview.combinations.length === 0 ? (
                <Alert severity="info">
                  {dictionary.admin.products.generation.emptyPreview}
                </Alert>
              ) : (
                <List dense>
                  {preview.combinations.map((combination, index) => (
                    <ListItem key={`${combination.label}-${index}`}>
                      {combination.label}
                    </ListItem>
                  ))}
                </List>
              )}
              {preview.duplicateCombinations.length > 0 ? (
                <Alert severity="warning">
                  <Typography variant="subtitle2">
                    {dictionary.admin.products.generation.duplicateTitle}
                  </Typography>
                  {preview.duplicateCombinations.map((combination, index) => (
                    <Typography
                      key={`${combination.label}-${index}`}
                      variant="caption"
                      component="div"
                    >
                      {combination.label}
                    </Typography>
                  ))}
                </Alert>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={isPending} onClick={onClose}>
          {dictionary.admin.products.generation.cancel}
        </Button>
        <Button
          variant="contained"
          disabled={
            isPending ||
            !preview ||
            preview.combinations.length === 0 ||
            !skuPrefix.trim()
          }
          onClick={() => void confirmGeneration()}
        >
          {dictionary.admin.products.generation.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
