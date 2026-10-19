import { CompanyValues } from "@/values/app_values";
import { Box } from "@mui/material";

export function BrandLogo({
  variant = "wordmark",
  width = 152,
}: {
  variant?: "wordmark" | "signature" | "isotype";
  width?: number;
}) {
  const ratios = {
    wordmark: "704 / 160",
    signature: "704 / 231",
    isotype: "1",
  };
  return (
    <Box
      component="span"
      role="img"
      aria-label={CompanyValues.name}
      sx={{
        display: "block",
        width,
        maxWidth: "100%",
        aspectRatio: ratios[variant],
        flexShrink: 0,
        bgcolor: "currentColor",
        mask: `url(/brand/${variant}.svg) center / contain no-repeat`,
        WebkitMask: `url(/brand/${variant}.svg) center / contain no-repeat`,
      }}
    />
  );
}
