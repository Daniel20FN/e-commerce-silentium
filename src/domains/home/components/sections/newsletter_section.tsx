"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
import { Send } from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Container,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import * as React from "react";

export function NewsletterSection({ dictionary }: { dictionary: Dictionary }) {
  const theme = useTheme();
  const [email, setEmail] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    setEmail("");
  };

  return (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        backgroundColor:
          theme.palette.mode === "dark"
            ? AppColors.primaryLight
            : AppColors.primary,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "1.75rem", md: "2.25rem" },
              fontWeight: 700,
              color: AppColors.secondary,
              mb: 2,
            }}
          >
            Recibe Ofertas Exclusivas
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: alpha(AppColors.secondary, 0.8),
              mb: 4,
              maxWidth: 500,
              mx: "auto",
            }}
          >
            Suscribete a nuestro boletin y recibe un 10% de descuento en tu
            primera compra, ademas de acceso anticipado a nuevas colecciones.
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              maxWidth: 500,
              mx: "auto",
            }}
          >
            <TextField
              fullWidth
              placeholder="Tu correo electronico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: alpha("#fff", 0.1),
                  color: AppColors.secondary,
                  "& fieldset": {
                    borderColor: alpha(AppColors.secondary, 0.3),
                  },
                  "&:hover fieldset": {
                    borderColor: alpha(AppColors.secondary, 0.5),
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: AppColors.secondary,
                  },
                },
                "& .MuiOutlinedInput-input::placeholder": {
                  color: alpha(AppColors.secondary, 0.6),
                  opacity: 1,
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              endIcon={<Send />}
              sx={{
                px: 4,
                py: 1.5,
                backgroundColor: AppColors.accent,
                color: "#fff",
                whiteSpace: "nowrap",
                "&:hover": {
                  backgroundColor: AppColors.accentDark,
                },
              }}
            >
              Suscribirse
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 2,
              color: alpha(AppColors.secondary, 0.6),
            }}
          >
            Al suscribirte aceptas recibir correos promocionales. Puedes
            cancelar en cualquier momento.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
