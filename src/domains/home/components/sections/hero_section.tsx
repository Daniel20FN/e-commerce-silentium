"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { CompanyValues } from "@/values/app_values";
import { ArrowForward } from "@mui/icons-material";
import { alpha, Box, Button, Container, Typography } from "@mui/material";

export function HeroSection({
  dictionary: _dictionary,
}: {
  dictionary: Dictionary;
}) {
  void _dictionary;

  return (
    <Box
      sx={(theme) => ({
        position: "relative",
        minHeight: { xs: "90vh", md: "85vh" },
        display: "flex",
        alignItems: "center",
        backgroundColor:
          theme.palette.mode === "dark"
            ? theme.palette.background.default
            : theme.palette.secondary.light,
        overflow: "hidden",
      })}
    >
      {/* Background Pattern */}
      <Box
        sx={(theme) => ({
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05,
          backgroundImage: `radial-gradient(${theme.palette.info.main} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        })}
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
              <Box component="span" sx={{ color: "info.main" }}>
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
                sx={(theme) => ({
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.primary.main,
                  color: "#fff",
                  "&:hover": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? theme.palette.background.default
                        : theme.palette.primary.light,
                  },
                })}
              >
                Ver Coleccion
              </Button>
              <Button
                variant="outlined"
                size="large"
                sx={(theme) => ({
                  px: 4,
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderColor: theme.palette.info.main,
                  color: theme.palette.info.main,
                  "&:hover": {
                    borderColor: theme.palette.info.dark,
                    backgroundColor: alpha(theme.palette.info.main, 0.08),
                  },
                })}
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
                    sx={{ fontWeight: 700, color: "info.main" }}
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
                sx={(theme) => ({
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: alpha(
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : theme.palette.secondary.main,
                    0.5,
                  ),
                })}
              />

              {/* Main Image Placeholder */}
              <Box
                sx={(theme) => ({
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "85%",
                  height: "85%",
                  borderRadius: "50%",
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.primary.main
                      : theme.palette.secondary.main,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 20px 60px ${alpha(
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.primary.main,
                    0.15,
                  )}`,
                  overflow: "hidden",
                })}
              >
                <Box
                  sx={(theme) => ({
                    width: "100%",
                    height: "100%",
                    background: `linear-gradient(135deg, ${
                      theme.palette.mode === "dark"
                        ? theme.palette.primary.main
                        : theme.palette.secondary.main
                    } 0%, ${
                      theme.palette.mode === "dark"
                        ? theme.palette.primary.dark
                        : theme.palette.secondary.dark
                    } 100%)`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 4,
                  })}
                >
                  <Typography
                    variant="h2"
                    sx={(theme) => ({
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.background.paper
                          : theme.palette.primary.main,
                      fontWeight: 700,
                      textAlign: "center",
                      fontSize: { xs: "2rem", md: "3rem" },
                    })}
                  >
                    Dulces
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      color: "info.main",
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
                sx={(theme) => ({
                  position: "absolute",
                  top: "10%",
                  right: "-5%",
                  px: 2,
                  py: 1,
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2,
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.primary.main,
                    0.1,
                  )}`,
                })}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "info.main" }}
                >
                  -30% OFF
                </Typography>
              </Box>

              <Box
                sx={(theme) => ({
                  position: "absolute",
                  bottom: "15%",
                  left: "-10%",
                  px: 2,
                  py: 1,
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2,
                  boxShadow: `0 4px 20px ${alpha(
                    theme.palette.mode === "dark"
                      ? theme.palette.background.paper
                      : theme.palette.primary.main,
                    0.1,
                  )}`,
                })}
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
