import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { AdminProductErrorCode } from "@/domains/admin/products/types/product_errors";
import { Alert, Stack } from "@mui/material";

interface ProductSellabilityWarningsProps {
  dictionary: Dictionary;
  warnings: AdminProductErrorCode[];
}

export function ProductSellabilityWarnings({
  dictionary,
  warnings,
}: ProductSellabilityWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  const warningMessages = dictionary.admin.products.warnings as Record<
    string,
    string
  >;

  return (
    <Stack spacing={0.75}>
      {warnings.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ py: 0 }}>
          {warningMessages[warning] ?? warning}
        </Alert>
      ))}
    </Stack>
  );
}
