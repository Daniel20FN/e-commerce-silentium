"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { apiService } from "@/types/api-service/api_service";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { ProductWorkspaceSection } from "../services/product_workspace_links";
import type { AdminPublicationApiResponse } from "../types/api_params";
import type { PublicationReport } from "../types/publication";

export function PublicationPanel({
  dictionary,
  productId,
  revision,
  returnTo,
  saving,
  onChangeSection,
  onPublish,
  onReload,
}: {
  dictionary: Dictionary;
  productId: string;
  revision: string;
  returnTo: string;
  saving: boolean;
  onChangeSection: (section: ProductWorkspaceSection) => void;
  onPublish: () => void;
  onReload: () => void;
}) {
  const copy = dictionary.admin.products.publication;
  const [report, setReport] = useState<PublicationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiService
      .get<AdminPublicationApiResponse, undefined>(
        `/admin/products/${productId}/publication`,
        undefined,
        undefined,
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          if (!data) throw new Error("load_failed");
          setReport(data.report);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error && reason.message === "record_not_found"
              ? copy.notFound
              : copy.loadError,
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId, reload, copy.notFound, copy.loadError]);
  const stale = report !== null && revision !== report.updatedAt;
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <Typography component="h2" variant="h6">
          {copy.title}
        </Typography>
        <Button
          disabled={loading || saving}
          onClick={() => {
            setLoading(true);
            setError(null);
            setReload((value) => value + 1);
          }}
        >
          {copy.refresh}
        </Button>
      </Stack>
      <Alert severity="info">{copy.savedOnly}</Alert>
      {loading ? (
        <Stack direction="row" gap={1} role="status">
          <CircularProgress size={20} />
          <Typography>{copy.loading}</Typography>
        </Stack>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        report && (
          <>
            {stale && (
              <Alert
                severity="warning"
                action={
                  <Button disabled={saving} onClick={onReload}>
                    {dictionary.admin.products.workspace.reload}
                  </Button>
                }
              >
                {copy.stale}
              </Alert>
            )}
            <Stack spacing={1.5} aria-label={copy.title}>
              <Typography>
                {copy.state}:{" "}
                <strong>
                  {dictionary.admin.products.status[report.status]}
                </strong>
              </Typography>
              <Typography>
                {copy.visibility}:{" "}
                <strong>{report.visible ? copy.visible : copy.hidden}</strong>
              </Typography>
              <Typography>
                {copy.purchase}:{" "}
                <strong>
                  {report.purchasable ? copy.purchasable : copy.notPurchasable}
                </strong>
              </Typography>
              <Typography variant="body2">
                {copy.variantsReady.replace(
                  "{count}",
                  String(report.readyVariantCount),
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report.selectedSku
                  ? copy.initialVariant.replace("{sku}", report.selectedSku)
                  : copy.noInitialVariant}
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              flexWrap="wrap"
            >
              <Button
                component="a"
                href={`/admin/productos/${encodeURIComponent(productId)}/preview?returnTo=${encodeURIComponent(returnTo)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.openPreview}
              </Button>
              {report.publicUrl && (
                <Button
                  component="a"
                  href={report.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.openStore}
                </Button>
              )}
              {!report.readOnly && report.status !== "active" && (
                <Button
                  variant="contained"
                  disabled={saving || stale}
                  onClick={() => setConfirm(true)}
                >
                  {copy.publish}
                </Button>
              )}
              {!report.readOnly && (
                <Button
                  disabled={saving}
                  onClick={() => onChangeSection("information")}
                >
                  {copy.editState}
                </Button>
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {copy.publishHelp}
            </Typography>
            <Divider />
            {report.issues.length ? (
              report.issues.map((issue) => (
                <Alert
                  key={issue.code}
                  severity={
                    issue.level === "blocker"
                      ? "error"
                      : issue.level === "warning"
                        ? "warning"
                        : "info"
                  }
                >
                  <Typography variant="subtitle2">
                    {copy[issue.level]}
                  </Typography>
                  <Typography variant="body2">
                    {copy.issues[issue.code]}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    disabled={saving}
                    onClick={() => onChangeSection(issue.section)}
                  >
                    {copy.fix.replace(
                      "{section}",
                      dictionary.admin.products.workspace[issue.section],
                    )}
                  </Button>
                </Alert>
              ))
            ) : (
              <Alert severity="success">{copy.allReady}</Alert>
            )}
            <Divider />
            <Typography component="h3" variant="h6">
              {copy.categories}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {copy.categoryHelp}
            </Typography>
            {report.categories.map((category) => (
              <Stack key={category.id} spacing={1}>
                <Typography sx={{ overflowWrap: "anywhere" }}>
                  {category.name}
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={
                      category.inTrash
                        ? copy.trash
                        : category.active
                          ? copy.active
                          : copy.inactive
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      category.visible
                        ? copy.categoryVisible
                        : copy.categoryHidden
                    }
                  />
                </Stack>
              </Stack>
            ))}
            <Typography component="h3" variant="h6">
              {copy.variants}
            </Typography>
            {report.variants.map((variant) => (
              <Stack key={variant.id} spacing={1}>
                <Typography sx={{ overflowWrap: "anywhere" }}>
                  {variant.sku}
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={
                      variant.inTrash
                        ? copy.trash
                        : variant.active
                          ? copy.active
                          : copy.inactive
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={copy.stock.replace("{count}", String(variant.stock))}
                  />
                  {variant.isDefault && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={copy.default}
                    />
                  )}
                </Stack>
              </Stack>
            ))}
          </>
        )
      )}
      {confirm && (
        <Dialog
          open
          fullWidth
          maxWidth="sm"
          onClose={() => {
            if (!saving) setConfirm(false);
          }}
        >
          <DialogTitle>{copy.confirmTitle}</DialogTitle>
          <DialogContent>
            <Typography>{copy.confirmBody}</Typography>
          </DialogContent>
          <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
            <Button disabled={saving} onClick={() => setConfirm(false)}>
              {copy.cancel}
            </Button>
            <Button
              variant="contained"
              disabled={saving || stale || !report || report.readOnly}
              onClick={() => {
                setConfirm(false);
                onPublish();
              }}
            >
              {copy.confirm}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Stack>
  );
}
