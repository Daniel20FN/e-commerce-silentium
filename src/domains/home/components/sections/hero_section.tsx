"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
import { CompanyValues } from "@/values/app_values";
import { ArrowForward } from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Container,
  Typography,
  useTheme,
} from "@mui/material";

export function HeroSection({ dictionary }: { dictionary: Dictionary }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: { xs: "90vh", md: "85vh" },
        display: "flex",
        alignItems: "center",
        backgroundColor:
          theme.palette.mode === "dark"
            ? AppColors.primaryDark
            : AppColors.secondaryLight,
        overflow: "hidden",
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `radial-gradient(${AppColors.accent} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "center",
            gap: { xs: 4, md: 8 },
          }}
        >
          {/* Content */}
          <Box
            sx={{ flex: 1, textAlign: { xs: "center", md: "left" }, zIndex: 1 }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: {
                  xs: "2.5rem",
                  sm: "3.5rem",
                  md: "4rem",
                  lg: "4.5rem",
                },
                fontWeight: 700,
                lineHeight: 1.1,
                mb: 3,
                color: "text.primary",
              }}
            >
              Confort y elegancia
              <br />
              <Box
                component="span"
                sx={{
                  color: AppColors.accent,
                }}
              >
                para tu descanso
              </Box>
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: "text.secondary",
                mb: 4,
                maxWidth: 500,
                mx: { xs: "auto", md: 0 },
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              Descubre nuestra exclusiva coleccion de ropa de cama premium.
              Sabanas, cobijas y edredones que transformaran tu habitacion en un
              refugio de tranquilidad.
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: { xs: "center", md: "flex-start" },
              }}
            >
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  backgroundColor: AppColors.primary,
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: AppColors.primaryLight,
                  },
                }}
              >
                Ver Coleccion
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderColor: AppColors.accent,
                  color: AppColors.accent,
                  "&:hover": {
                    borderColor: AppColors.accentDark,
                    backgroundColor: alpha(AppColors.accent, 0.08),
                  },
                }}
              >
                Conoce Nuestra Historia
              </Button>
            </Box>

            {/* Stats */}
            <Box
              sx={{
                display: "flex",
                gap: { xs: 4, md: 6 },
                mt: 6,
                justifyContent: { xs: "center", md: "flex-start" },
              }}
            >
              {[{ value: "100%", label: "Producto Colombiano" }].map((stat) => (
                <Box key={stat.label} sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: AppColors.accent }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", fontWeight: 500 }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Hero Image Area */}
          <Box
            sx={{
              flex: 1,
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                position: "relative",
                width: { xs: 300, sm: 400, md: 500 },
                height: { xs: 300, sm: 400, md: 500 },
              }}
            >
              {/* Decorative Circle */}
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: alpha(AppColors.secondary, 0.5),
                }}
              />

              {/* Main Image Placeholder */}
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "85%",
                  height: "85%",
                  borderRadius: "50%",
                  backgroundColor: AppColors.secondary,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 20px 60px ${alpha(AppColors.primary, 0.15)}`,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    background: `linear-gradient(135deg, ${AppColors.secondary} 0%, ${AppColors.secondaryDark} 100%)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 4,
                  }}
                >
                  <Typography
                    variant="h2"
                    sx={{
                      color: AppColors.primary,
                      fontWeight: 700,
                      textAlign: "center",
                      fontSize: { xs: "2rem", md: "3rem" },
                    }}
                  >
                    Dulces
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      color: AppColors.accent,
                      fontWeight: 700,
                      textAlign: "center",
                      fontSize: { xs: "2rem", md: "3rem" },
                    }}
                  >
                    Sueños
                  </Typography>
                </Box>
              </Box>

              {/* Floating Elements */}
              <Box
                sx={{
                  position: "absolute",
                  top: "10%",
                  right: "-5%",
                  px: 2,
                  py: 1,
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2,
                  boxShadow: `0 4px 20px ${alpha(AppColors.primary, 0.1)}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: AppColors.accent }}
                >
                  -30% OFF
                </Typography>
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  bottom: "15%",
                  left: "-10%",
                  px: 2,
                  py: 1,
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2,
                  boxShadow: `0 4px 20px ${alpha(AppColors.primary, 0.1)}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {CompanyValues.name}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
