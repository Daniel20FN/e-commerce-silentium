"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import {
  Autorenew,
  LocalShipping,
  SupportAgent,
  Verified,
} from "@mui/icons-material";
import { alpha, Box, Container, Typography, useTheme } from "@mui/material";

const benefits = [
  {
    icon: LocalShipping,
    title: "Envio Gratis",
    description:
      "En compras mayores a $150.000. Entrega rapida en todo el pais.",
  },
  {
    icon: Verified,
    title: "Calidad Garantizada",
    description:
      "Todos nuestros productos cuentan con garantia de calidad premium.",
  },
  {
    icon: Autorenew,
    title: "Cambios y Devoluciones",
    description: "30 dias para cambios o devoluciones sin complicaciones.",
  },
  {
    icon: SupportAgent,
    title: "Atencion Personalizada",
    description: "Equipo de expertos disponible para asesorarte en tu compra.",
  },
];

export function BenefitsSection({
  dictionary: _dictionary,
}: {
  dictionary: Dictionary;
}) {
  void _dictionary;

  const theme = useTheme();

  return (
    <Box
      sx={(theme) => ({
        py: { xs: 8, md: 10 },
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : theme.palette.secondary.main,
      })}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: { xs: 4, md: 6 },
          }}
        >
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Box
                key={benefit.title}
                sx={{
                  textAlign: "center",
                  px: 2,
                }}
              >
                <Box
                  sx={(theme) => ({
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.primary.main, 0.08),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  })}
                >
                  <Icon
                    sx={(theme) => ({
                      fontSize: 32,
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.primary.main
                          : theme.palette.info.main,
                    })}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={(theme) => ({
                    fontWeight: 600,
                    mb: 1,
                    color:
                      theme.palette.mode === "dark"
                        ? theme.palette.primary.main
                        : theme.palette.primary.main,
                  })}
                >
                  {benefit.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: alpha(theme.palette.primary.main, 0.7),
                    lineHeight: 1.6,
                  }}
                >
                  {benefit.description}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
