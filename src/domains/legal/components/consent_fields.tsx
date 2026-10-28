"use client";
import {
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import type { LegalUiCopy } from "../services/legal_ui_copy";
import type { LegalAcceptanceParams } from "../types/api_params";

export function ConsentFields({
  copy,
  value,
  onChange,
  disabled = false,
}: {
  copy: LegalUiCopy;
  value: Pick<LegalAcceptanceParams, "acceptTerms" | "acceptPrivacy" | "adult">;
  onChange: (
    key: "acceptTerms" | "acceptPrivacy" | "adult",
    checked: boolean,
  ) => void;
  disabled?: boolean;
}) {
  return (
    <Stack spacing={1}>
      {(
        [
          {
            key: "acceptTerms",
            label: copy.controls.terms,
            href: "/legal/terminos",
            link: copy.termsLink,
          },
          {
            key: "acceptPrivacy",
            label: copy.controls.privacy,
            href: "/legal/privacidad",
            link: copy.privacyLink,
          },
          { key: "adult", label: copy.controls.adult, href: null, link: null },
        ] as const
      ).map((item) => (
        <Stack key={item.key} spacing={0.25}>
          <FormControlLabel
            sx={{ alignItems: "flex-start", m: 0 }}
            control={
              <Checkbox
                required
                slotProps={{ input: { "aria-label": item.label } }}
                disabled={disabled}
                checked={value[item.key]}
                onChange={(event) => onChange(item.key, event.target.checked)}
                sx={{ mt: -0.5 }}
              />
            }
            label={<Typography variant="body2">{item.label}</Typography>}
          />
          {item.href && (
            <Link
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ ml: 5.25, fontSize: "0.875rem", minHeight: 32 }}
            >
              {item.link}
            </Link>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
