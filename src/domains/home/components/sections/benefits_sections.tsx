"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
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

export function BenefitsSection({ dictionary }: { dictionary: Dictionary }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 8, md: 10 },
        backgroundColor:
          theme.palette.mode === "dark"
            ? AppColors.primary
            : AppColors.secondary,
      }}
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
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? alpha(AppColors.secondary, 0.1)
                        : alpha(AppColors.primary, 0.08),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <Icon
                    sx={{
                      fontSize: 32,
                      color:
                        theme.palette.mode === "dark"
                          ? AppColors.secondary
                          : AppColors.accent,
                    }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color:
                      theme.palette.mode === "dark"
                        ? AppColors.secondary
                        : AppColors.primary,
                  }}
                >
                  {benefit.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === "dark"
                        ? alpha(AppColors.secondary, 0.7)
                        : alpha(AppColors.primary, 0.7),
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
