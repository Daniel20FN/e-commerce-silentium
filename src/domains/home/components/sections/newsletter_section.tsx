"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { Send } from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Container,
  TextField,
  Typography,
} from "@mui/material";
import type { FormEvent } from "react";
import { useState } from "react";

export function NewsletterSection({
  dictionary: _dictionary,
}: {
  dictionary: Dictionary;
}) {
  void _dictionary;

  const [email, setEmail] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    setEmail("");
  };

  return (
    <Box
      sx={(theme) => ({
        py: { xs: 8, md: 10 },
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : theme.palette.primary.main,
      })}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h3"
            sx={(theme) => ({
              fontSize: { xs: "1.75rem", md: "2.25rem" },
              fontWeight: 700,
              color:
                theme.palette.mode === "dark"
                  ? theme.palette.text.primary
                  : theme.palette.secondary.main,
              mb: 2,
            })}
          >
            Recibe Ofertas Exclusivas
          </Typography>
          <Typography
            variant="body1"
            sx={(theme) => ({
              color: alpha(
                theme.palette.mode === "dark"
                  ? theme.palette.text.primary
                  : theme.palette.secondary.main,
                0.8,
              ),
              mb: 4,
              maxWidth: 500,
              mx: "auto",
            })}
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
              sx={(theme) => ({
                "& .MuiOutlinedInput-root": {
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                  color:
                    theme.palette.mode === "dark"
                      ? theme.palette.text.primary
                      : theme.palette.secondary.main,
                  "& fieldset": {
                    borderColor: alpha(
                      theme.palette.mode === "dark"
                        ? theme.palette.text.primary
                        : theme.palette.secondary.main,
                      0.3,
                    ),
                  },
                  "&:hover fieldset": {
                    borderColor: alpha(
                      theme.palette.mode === "dark"
                        ? theme.palette.text.primary
                        : theme.palette.secondary.main,
                      0.5,
                    ),
                  },
                  "&.Mui-focused fieldset": {
                    borderColor:
                      theme.palette.mode === "dark"
                        ? theme.palette.text.primary
                        : theme.palette.secondary.main,
                  },
                },
                "& .MuiOutlinedInput-input::placeholder": {
                  color: alpha(
                    theme.palette.mode === "dark"
                      ? theme.palette.text.primary
                      : theme.palette.secondary.main,
                    0.6,
                  ),
                  opacity: 1,
                },
              })}
            />
            <Button
              type="submit"
              variant="contained"
              endIcon={<Send />}
              sx={(theme) => ({
                px: 4,
                py: 1.5,
                backgroundColor: theme.palette.info.main,
                color: "#fff",
                whiteSpace: "nowrap",
                "&:hover": {
                  backgroundColor: theme.palette.info.dark,
                },
              })}
            >
              Suscribirse
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={(theme) => ({
              display: "block",
              mt: 2,
              color: alpha(
                theme.palette.mode === "dark"
                  ? theme.palette.text.primary
                  : theme.palette.secondary.main,
                0.6,
              ),
            })}
          >
            Al suscribirte aceptas recibir correos promocionales. Puedes
            cancelar en cualquier momento.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
