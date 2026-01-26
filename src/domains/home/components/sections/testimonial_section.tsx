"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
import { ChevronLeft, ChevronRight, FormatQuote } from "@mui/icons-material";
import {
  alpha,
  Avatar,
  Box,
  Card,
  CardContent,
  Container,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import * as React from "react";

const testimonials = [
  {
    id: 1,
    name: "Maria Fernanda Lopez",
    role: "Cliente desde 2022",
    content:
      "Las sabanas de algodon egipcio son increibles. Nunca habia dormido tan bien. La calidad es excepcional y el servicio al cliente es de primera.",
    avatar: "MF",
    rating: 5,
  },
  {
    id: 2,
    name: "Carlos Andres Martinez",
    role: "Cliente desde 2023",
    content:
      "Compre el edredon de plumas y estoy encantado. Es exactamente lo que buscaba para el frio de Bogota. Muy recomendado.",
    avatar: "CA",
    rating: 5,
  },
  {
    id: 3,
    name: "Ana Sofia Gutierrez",
    role: "Cliente desde 2021",
    content:
      "Excelente variedad de productos y precios justos. He comprado varias veces y siempre quedo satisfecha. El envio siempre llega a tiempo.",
    avatar: "AS",
    rating: 5,
  },
];

export function TestimonialsSection({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? testimonials.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
          <Typography
            component="span"
            sx={{
              display: "inline-block",
              px: 2,
              py: 0.5,
              mb: 2,
              borderRadius: 5,
              backgroundColor: alpha(AppColors.accent, 0.1),
              color: AppColors.accent,
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Testimonios
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: "2rem", md: "2.5rem" },
              fontWeight: 700,
              color: "text.primary",
              mb: 2,
            }}
          >
            Lo Que Dicen Nuestros Clientes
          </Typography>
        </Box>

        {/* Testimonial Carousel */}
        <Box sx={{ position: "relative" }}>
          <Card
            sx={{
              maxWidth: 800,
              mx: "auto",
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: `0 10px 40px ${alpha(AppColors.primary, 0.08)}`,
            }}
          >
            <CardContent sx={{ p: { xs: 4, md: 6 } }}>
              <FormatQuote
                sx={{
                  fontSize: 48,
                  color: AppColors.accent,
                  opacity: 0.3,
                  mb: 2,
                }}
              />

              <Typography
                variant="h6"
                sx={{
                  color: "text.primary",
                  fontWeight: 400,
                  lineHeight: 1.8,
                  mb: 4,
                  fontStyle: "italic",
                }}
              >
                &quot;{testimonials[currentIndex].content}&quot;
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    backgroundColor: AppColors.accent,
                    fontWeight: 600,
                  }}
                >
                  {testimonials[currentIndex].avatar}
                </Avatar>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    {testimonials[currentIndex].name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {testimonials[currentIndex].role}
                  </Typography>
                </Box>
                <Box sx={{ ml: "auto", display: "flex" }}>
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Typography
                      key={i}
                      sx={{ color: AppColors.accent, fontSize: 20 }}
                    >
                      ★
                    </Typography>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
              mt: 4,
            }}
          >
            <IconButton
              onClick={handlePrev}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": {
                  backgroundColor: alpha(AppColors.accent, 0.08),
                  borderColor: AppColors.accent,
                },
              }}
            >
              <ChevronLeft />
            </IconButton>

            <Box sx={{ display: "flex", gap: 1 }}>
              {testimonials.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  sx={{
                    width: index === currentIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      index === currentIndex
                        ? AppColors.accent
                        : alpha(AppColors.accent, 0.3),
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </Box>

            <IconButton
              onClick={handleNext}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                "&:hover": {
                  backgroundColor: alpha(AppColors.accent, 0.08),
                  borderColor: AppColors.accent,
                },
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
