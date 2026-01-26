"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
import {
  alpha,
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  useTheme,
} from "@mui/material";

const categories = [
  {
    title: "Sabanas",
    description: "Suavidad y frescura para cada noche",
    count: "45 productos",
    icon: "S",
  },
  {
    title: "Cobijas",
    description: "Calidez que abraza tu descanso",
    count: "32 productos",
    icon: "C",
  },
  {
    title: "Edredones",
    description: "Confort premium para tu habitacion",
    count: "28 productos",
    icon: "E",
  },
  {
    title: "Cubrelechos",
    description: "Estilo y proteccion en uno",
    count: "24 productos",
    icon: "CL",
  },
  {
    title: "Almohadas",
    description: "Soporte perfecto para tu descanso",
    count: "18 productos",
    icon: "A",
  },
  {
    title: "Protectores",
    description: "Cuida tu colchon por mas tiempo",
    count: "15 productos",
    icon: "P",
  },
];

export function CategoriesSection({ dictionary }: { dictionary: Dictionary }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Container maxWidth="xl">
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
            Categorias
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
            Explora Nuestras Colecciones
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            Encuentra la ropa de cama perfecta para cada estilo y necesidad.
            Calidad premium en cada producto.
          </Typography>
        </Box>

        {/* Categories Grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 3,
          }}
        >
          {categories.map((category) => (
            <Card
              key={category.title}
              sx={{
                cursor: "pointer",
                transition: "all 0.3s ease",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: `0 20px 40px ${alpha(AppColors.primary, 0.1)}`,
                  borderColor: AppColors.accent,
                  "& .category-icon": {
                    backgroundColor: AppColors.accent,
                    color: "#fff",
                  },
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
                  <Box
                    className="category-icon"
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      backgroundColor: alpha(AppColors.accent, 0.1),
                      color: AppColors.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, mb: 0.5, color: "text.primary" }}
                    >
                      {category.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", mb: 1 }}
                    >
                      {category.description}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: AppColors.accent,
                        fontWeight: 600,
                      }}
                    >
                      {category.count}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
