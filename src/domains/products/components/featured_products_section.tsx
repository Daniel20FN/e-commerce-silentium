"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { priceFormatter } from "@/utils/price_formatter";
import {
  ArrowForward,
  Favorite,
  FavoriteBorder,
  ShoppingCart,
} from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { useState } from "react";

const products = [
  {
    id: 1,
    name: "Sabanas de Algodon Egipcio",
    price: 189000,
    originalPrice: 249000,
    rating: 4.8,
    reviews: 124,
    badge: "Mas Vendido",
  },
  {
    id: 2,
    name: "Cobija Termica Premium",
    price: 159000,
    originalPrice: null,
    rating: 4.9,
    reviews: 89,
    badge: "Nuevo",
  },
  {
    id: 3,
    name: "Edredon Plumas de Ganso",
    price: 399000,
    originalPrice: 499000,
    rating: 4.7,
    reviews: 67,
    badge: "-20%",
  },
  {
    id: 4,
    name: "Cubrelecho Bordado Floral",
    price: 279000,
    originalPrice: null,
    rating: 4.6,
    reviews: 45,
    badge: null,
  },
];

export function FeaturedProductsSection({
  dictionary: _dictionary,
}: {
  dictionary: Dictionary;
}) {
  void _dictionary;

  const theme = useTheme();
  const [favorites, setFavorites] = useState<number[]>([]);
  const productSurfacePalette =
    theme.palette.mode === "dark"
      ? theme.palette.primary
      : theme.palette.secondary;
  const productImageBackgrounds = [
    productSurfacePalette.main,
    productSurfacePalette.dark,
    productSurfacePalette.light,
    productSurfacePalette.main,
  ];
  const baseShadowColor =
    theme.palette.mode === "dark"
      ? theme.palette.background.paper
      : theme.palette.primary.main;
  const actionBackgroundColor =
    theme.palette.mode === "dark"
      ? theme.palette.background.paper
      : theme.palette.primary.main;
  const actionHoverBackgroundColor =
    theme.palette.mode === "dark"
      ? theme.palette.background.default
      : theme.palette.primary.light;
  const deepSurfaceTextColor =
    theme.palette.mode === "dark"
      ? theme.palette.background.paper
      : theme.palette.primary.main;

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id],
    );
  };

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Container maxWidth="xl">
        {/* Section Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            mb: { xs: 6, md: 8 },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              component="span"
              sx={(theme) => ({
                display: "inline-block",
                px: 2,
                py: 0.5,
                mb: 2,
                borderRadius: 5,
                backgroundColor: alpha(theme.palette.info.main, 0.1),
                color: theme.palette.info.main,
                fontWeight: 600,
                fontSize: "0.875rem",
              })}
            >
              Destacados
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: "2rem", md: "2.5rem" },
                fontWeight: 700,
                color: "text.primary",
              }}
            >
              Productos Destacados
            </Typography>
          </Box>
          <Button
            endIcon={<ArrowForward />}
            sx={(theme) => ({
              color: theme.palette.info.main,
              fontWeight: 600,
              "&:hover": {
                backgroundColor: alpha(theme.palette.info.main, 0.08),
              },
            })}
          >
            Ver Todos
          </Button>
        </Box>

        {/* Products Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
          }}
        >
          {products.map((product, index) => (
            <Card
              key={product.id}
              sx={{
                position: "relative",
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: `0 20px 40px ${alpha(baseShadowColor, 0.1)}`,
                  "& .add-to-cart": {
                    opacity: 1,
                    transform: "translateY(0)",
                  },
                },
              }}
            >
              {/* Product Image */}
              <Box
                sx={{
                  position: "relative",
                  height: 280,
                  backgroundColor:
                    productImageBackgrounds[
                      index % productImageBackgrounds.length
                    ],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {product.badge && (
                  <Chip
                    label={product.badge}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      backgroundColor:
                        product.badge === "Nuevo"
                          ? theme.palette.info.main
                          : product.badge.includes("%")
                            ? theme.palette.error.main
                            : actionBackgroundColor,
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                )}
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: alpha(theme.palette.common.white, 0.9),
                    "&:hover": {
                      backgroundColor: theme.palette.common.white,
                    },
                  }}
                >
                  {favorites.includes(product.id) ? (
                    <Favorite sx={{ color: "#e53935" }} />
                  ) : (
                    <FavoriteBorder sx={{ color: "text.secondary" }} />
                  )}
                </IconButton>

                <Typography
                  variant="h4"
                  sx={{
                    color: deepSurfaceTextColor,
                    fontWeight: 700,
                    opacity: 0.3,
                  }}
                >
                  {product.name.split(" ")[0]}
                </Typography>

                {/* Add to Cart Button */}
                <Button
                  className="add-to-cart"
                  variant="contained"
                  startIcon={<ShoppingCart />}
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: "50%",
                    transform: "translateX(-50%) translateY(10px)",
                    opacity: 0,
                    transition: "all 0.3s ease",
                    backgroundColor: actionBackgroundColor,
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: actionHoverBackgroundColor,
                    },
                  }}
                >
                  Agregar
                </Button>
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    color: "text.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {product.name}
                </Typography>

                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: "info.main", fontWeight: 600 }}
                    >
                      {product.rating}
                    </Typography>
                    <Box sx={{ color: "info.main" }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    ({product.reviews} resenas)
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {priceFormatter(product.price)}
                  </Typography>
                  {product.originalPrice && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        textDecoration: "line-through",
                      }}
                    >
                      {priceFormatter(product.originalPrice)}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
