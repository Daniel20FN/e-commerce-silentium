"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type {
  AdminCategoryParentOptionDto,
  AdminCategoryParentOptionsApiResponse,
} from "@/domains/admin/categories/types/api_responses";
import type { AdminEditorState } from "@/domains/admin/components/admin_editor_surface";
import { CatalogCostsDialog } from "@/domains/admin/costs/components/catalog_costs_dialog";
import { InventoryPanel } from "@/domains/admin/inventory/components/inventory_panel";
import { CatalogMediaDialog } from "@/domains/admin/media/components/catalog_media_dialog";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceGuard } from "../hooks/use_workspace_guard";
import {
  PRODUCT_WORKSPACE_SECTIONS,
  resolveWorkspaceSection,
  safeProductsReturnUrl,
  type ProductWorkspaceSection,
} from "../services/product_workspace_links";
import { publicationPayload } from "../services/publication_rules";
import type {
  AdminProductDetailApiResponse,
  AdminProductMutationApiResponse,
  AdminProductUpsertParams,
  AdminProductVariantsListApiResponse,
} from "../types/api_params";
import type {
  AdminProductDetailDto,
  AdminProductVariantDto,
} from "../types/product_dto";
import { DuplicateProductDialog } from "./duplicate_product_dialog";
import { EditorGuardDialog } from "./editor_guard_dialog";
import { PriceBatchEditor } from "./price_batch_editor";
import { ProductFormDialog } from "./product_form_dialog";
import { ProductVariantEditor } from "./product_variant_editor";
import { PublicationPanel } from "./publication_panel";
import { VariantGenerationDialog } from "./variant_generation_dialog";

export function ProductWorkspace({
  dictionary,
  productId,
  initialSection,
  initialGenerate = false,
  returnTo,
}: {
  dictionary: Dictionary;
  productId: string;
  initialSection?: string;
  initialGenerate?: boolean;
  returnTo?: string;
}) {
  const copy = dictionary.admin.products.workspace;
  const [product, setProduct] = useState<AdminProductDetailDto | null>(null);
  const [variants, setVariants] = useState<AdminProductVariantDto[]>([]);
  const [categories, setCategories] = useState<AdminCategoryParentOptionDto[]>(
    [],
  );
  const [section, setSection] = useState(() =>
    resolveWorkspaceSection(initialSection),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorFocus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saveError) errorFocus.current?.focus();
  }, [saveError]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [generation, setGeneration] = useState(initialGenerate);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [priceBatch, setPriceBatch] = useState(false);
  const [editor, setEditor] = useState<AdminEditorState>({
    busy: false,
    dirty: false,
  });
  const guard = useWorkspaceGuard({
    busy: saving || editor.busy,
    dirty: editor.dirty,
  });
  const reportState = useCallback((state: AdminEditorState) => {
    if (state.dirty || state.busy) setSaved(false);
    setEditor((current) =>
      current.busy === state.busy && current.dirty === state.dirty
        ? current
        : state,
    );
  }, []);
  const back = safeProductsReturnUrl(returnTo);
  const readOnly =
    product?.inTrash || product?.status === "archived" || !!product?.archivedAt;

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    reportState({ dirty: false, busy: false });
    void Promise.all([
      apiService.get<AdminProductDetailApiResponse, undefined>(
        `/admin/products/${productId}`,
        undefined,
        undefined,
        controller.signal,
      ),
      apiService.get<AdminProductVariantsListApiResponse, undefined>(
        `/admin/products/${productId}/variants`,
        undefined,
        undefined,
        controller.signal,
      ),
      apiService.get<AdminCategoryParentOptionsApiResponse, undefined>(
        "/admin/categories/parent-options",
        undefined,
        undefined,
        controller.signal,
      ),
    ])
      .then(([detail, variantData, categoryData]) => {
        if (!mounted) return;
        if (!detail || !variantData || !categoryData)
          throw new Error("load_failed");
        setProduct(detail.product);
        setVariants(variantData.items);
        setCategories(categoryData.items);
        reportState({ dirty: false, busy: false });
        setEditorKey((value) => value + 1);
      })
      .catch((error) => {
        if (mounted)
          setLoadError(
            error instanceof Error && error.message === "record_not_found"
              ? copy.notFound
              : error instanceof Error &&
                  (error.message === "forbidden" ||
                    error.message === "unauthorized")
                ? copy.accessError
                : copy.loadError,
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    productId,
    reload,
    copy.notFound,
    copy.loadError,
    copy.accessError,
    reportState,
  ]);

  const changeSection = (next: ProductWorkspaceSection) => {
    if (next === section) return;
    guard.request(() => {
      reportState({ dirty: false, busy: false });
      setSection(next);
      setSaveError(null);
      setSaved(false);
      const url = new URL(window.location.href);
      url.searchParams.set("section", next);
      url.searchParams.delete("generate");
      window.history.replaceState(window.history.state, "", url);
    });
  };
  const resetEditor = () =>
    guard.request(() => {
      setEditorKey((value) => value + 1);
      reportState({ dirty: false, busy: false });
      setSaveError(null);
    });
  const saveProduct = async (payload: AdminProductUpsertParams) => {
    if (!product || readOnly || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const response = await apiService.patch<
        AdminProductMutationApiResponse,
        AdminProductUpsertParams
      >(`/admin/products/${productId}`, payload);
      if (!response) throw new Error("save_failed");
      reportState({ dirty: false, busy: false });
      setSaved(true);
      setReload((value) => value + 1);
    } catch (error) {
      const key = error instanceof Error ? error.message : "";
      setSaveError(
        Object.entries(dictionary.admin.products.feedback).find(
          ([code]) => code === key,
        )?.[1] ?? dictionary.admin.products.feedback.saveError,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Stack spacing={2} role="status" aria-label={copy.title}>
        <CircularProgress size={24} />
        <Typography>{dictionary.admin.products.description}</Typography>
      </Stack>
    );
  if (loadError || !product)
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError ?? copy.notFound}</Alert>
        <Button onClick={() => setReload((value) => value + 1)}>
          {copy.retry}
        </Button>
        <Button component="a" href={back}>
          {copy.back}
        </Button>
      </Stack>
    );

  return (
    <Stack
      spacing={2}
      data-ui="product-workspace"
      sx={{ minWidth: 0, maxWidth: 1120 }}
    >
      <Button component="a" href={back} sx={{ alignSelf: "flex-start" }}>
        {copy.back}
      </Button>
      <Stack spacing={1}>
        <Typography
          component="h1"
          variant="h5"
          sx={{ overflowWrap: "anywhere", fontWeight: 700 }}
        >
          {product.name}
        </Typography>
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={dictionary.admin.products.status[product.status]}
          />
          <Typography role="status" variant="body2" color="text.secondary">
            {saving || editor.busy
              ? copy.busy
              : editor.dirty
                ? copy.dirty
                : copy.saved}
          </Typography>
          <Button
            size="small"
            onClick={() => guard.request(() => setReload((value) => value + 1))}
          >
            {copy.reload}
          </Button>
          {!readOnly && (
            <Button
              size="small"
              disabled={saving || editor.busy}
              onClick={() =>
                guard.request(() => {
                  setEditorKey((value) => value + 1);
                  reportState({ dirty: false, busy: false });
                  setDuplicateOpen(true);
                })
              }
            >
              {dictionary.admin.products.operations.duplicate}
            </Button>
          )}
        </Stack>
      </Stack>
      {readOnly && <Alert severity="info">{copy.readOnly}</Alert>}
      {saved && <Alert severity="success">{copy.savedSuccess}</Alert>}
      {saveError && (
        <Alert severity="error" ref={errorFocus} tabIndex={-1}>
          {saveError}
        </Alert>
      )}
      <Tabs
        value={section}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label={copy.title}
        onChange={(_event, value: string) =>
          changeSection(resolveWorkspaceSection(value))
        }
        sx={{ borderBottom: 1, borderColor: "divider", minWidth: 0 }}
      >
        {PRODUCT_WORKSPACE_SECTIONS.map((item) => (
          <Tab
            key={item}
            id={`workspace-tab-${item}`}
            aria-controls={`workspace-panel-${item}`}
            value={item}
            label={copy[item]}
            sx={{ textTransform: "none" }}
          />
        ))}
      </Tabs>
      <Paper
        variant="outlined"
        role="tabpanel"
        id={`workspace-panel-${section}`}
        aria-labelledby={`workspace-tab-${section}`}
        sx={{ p: { xs: 1.5, md: 3 }, minWidth: 0 }}
      >
        {section === "information" &&
          (readOnly ? (
            <Stack spacing={2}>
              <Typography>{product.shortDescription}</Typography>
              <Typography>{product.longDescription}</Typography>
              <Typography>
                {product.categories.map((item) => item.name).join(", ")}
              </Typography>
            </Stack>
          ) : (
            <ProductFormDialog
              key={editorKey}
              embedded
              open
              dictionary={dictionary}
              product={product}
              categoryOptions={categories}
              isSubmitting={saving}
              onStateChange={reportState}
              onClose={resetEditor}
              onSubmit={(payload) => void saveProduct(payload)}
            />
          ))}
        {section === "variants" && (
          <Stack spacing={2}>
            {!readOnly && (
              <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                <Button
                  onClick={() =>
                    guard.request(() => {
                      setEditorKey((value) => value + 1);
                      reportState({ dirty: false, busy: false });
                      setPriceBatch((value) => !value);
                    })
                  }
                >
                  {priceBatch
                    ? dictionary.admin.products.operations.single
                    : dictionary.admin.products.operations.batch}
                </Button>
                {!priceBatch && (
                  <Button
                    sx={{ alignSelf: "flex-start" }}
                    onClick={() =>
                      guard.request(() => {
                        setEditorKey((value) => value + 1);
                        reportState({ dirty: false, busy: false });
                        setGeneration(true);
                      })
                    }
                  >
                    {dictionary.admin.products.actions.generateVariants}
                  </Button>
                )}
              </Stack>
            )}
            {readOnly ? (
              variants.map((variant) => (
                <Typography key={variant.id}>
                  {variant.sku} — {dictionary.admin.products.variants.stock}:{" "}
                  {variant.stock}
                </Typography>
              ))
            ) : priceBatch ? (
              <PriceBatchEditor
                key={editorKey}
                dictionary={dictionary}
                productId={productId}
                revision={product.updatedAt}
                variants={variants}
                onStateChange={reportState}
                onSaved={() => {
                  setSaved(true);
                  setReload((value) => value + 1);
                }}
              />
            ) : (
              <ProductVariantEditor
                key={editorKey}
                dictionary={dictionary}
                productId={productId}
                productOptions={product.options}
                initialVariants={variants}
                onStateChange={reportState}
                onRequestChange={guard.request}
                onVariantsChange={(next) => {
                  setVariants(next);
                  void apiService
                    .get<AdminProductDetailApiResponse, undefined>(
                      `/admin/products/${productId}`,
                    )
                    .then((data) => {
                      if (data) setProduct(data.product);
                    })
                    .catch(() => setSaveError(copy.loadError));
                }}
              />
            )}
          </Stack>
        )}
        {section === "media" &&
          (readOnly ? (
            <Alert severity="info">{copy.readOnly}</Alert>
          ) : (
            <CatalogMediaDialog
              key={editorKey}
              embedded
              dictionary={dictionary}
              product={product}
              variants={variants.filter((variant) => !variant.inTrash)}
              onStateChange={reportState}
              onClose={resetEditor}
            />
          ))}
        {section === "inventory" && (
          <InventoryPanel
            key={editorKey}
            dictionary={dictionary}
            productId={productId}
            onStateChange={reportState}
          />
        )}
        {section === "costs" && (
          <CatalogCostsDialog
            key={editorKey}
            embedded
            dictionary={dictionary}
            product={product}
            onStateChange={reportState}
            onClose={resetEditor}
          />
        )}
        {section === "publication" && (
          <PublicationPanel
            dictionary={dictionary}
            productId={productId}
            revision={product.updatedAt}
            returnTo={back}
            saving={saving}
            onChangeSection={changeSection}
            onPublish={() => void saveProduct(publicationPayload(product))}
            onReload={() =>
              guard.request(() => setReload((value) => value + 1))
            }
          />
        )}
      </Paper>
      {!readOnly && (
        <DuplicateProductDialog
          dictionary={dictionary}
          product={product}
          open={duplicateOpen}
          returnTo={back}
          onClose={() => setDuplicateOpen(false)}
          onBusyChange={setSaving}
        />
      )}
      {generation && !readOnly && (
        <VariantGenerationDialog
          dictionary={dictionary}
          open
          productId={productId}
          productOptions={product.options}
          onClose={() => {
            setGeneration(false);
            const url = new URL(window.location.href);
            url.searchParams.delete("generate");
            window.history.replaceState(window.history.state, "", url);
          }}
          onGenerated={() => {
            setReload((value) => value + 1);
          }}
        />
      )}
      <EditorGuardDialog dictionary={dictionary} guard={guard} />
    </Stack>
  );
}
