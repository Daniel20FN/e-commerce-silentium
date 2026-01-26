import {
  Alert,
  AlertColor,
  AlertTitle,
  Box,
  Typography,
  useTheme,
} from "@mui/material";
import React from "react";

export function CustomAlert({
  severity,
  title,
  body,
  variant = "outlined",
}: {
  severity: AlertColor;
  title: string;
  body?: React.ReactNode[];
  variant?: "standard" | "filled" | "outlined";
}) {
  const theme = useTheme();
  return (
    <Alert
      severity={severity}
      variant={variant}
      sx={{
        borderRadius: 2,
        backgroundColor: theme.palette[severity].light + "08",
        "& .MuiAlert-icon": {
          color: theme.palette[severity].main,
        },
      }}
    >
      <AlertTitle sx={{ fontWeight: theme.typography.fontWeightMedium, mb: 0 }}>
        {title}
      </AlertTitle>

      {body && body.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {body.map((text, index) => (
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
              }}
              key={index}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: theme.palette[severity].main,
                  mt: 0.75,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body1"
                sx={{ color: theme.palette.text.primary, lineHeight: 1.5 }}
              >
                {text}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Alert>
  );
}
