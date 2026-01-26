"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
import { CompanyValues } from "@/values/app_values";
import { Facebook, Instagram, Twitter, YouTube } from "@mui/icons-material";
import {
  alpha,
  Box,
  Container,
  Divider,
  IconButton,
  Link,
  Typography,
  useTheme,
} from "@mui/material";

const footerLinks = {
  productos: [
    { label: "Sabanas", href: "#" },
    { label: "Cobijas", href: "#" },
    { label: "Edredones", href: "#" },
    { label: "Cubrelechos", href: "#" },
    { label: "Almohadas", href: "#" },
  ],
  empresa: [
    { label: "Sobre Nosotros", href: "#" },
    { label: "Nuestra Historia", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Trabaja con Nosotros", href: "#" },
  ],
  ayuda: [
    { label: "Centro de Ayuda", href: "#" },
    { label: "Envios y Entregas", href: "#" },
    { label: "Devoluciones", href: "#" },
    { label: "Metodos de Pago", href: "#" },
    { label: "Contacto", href: "#" },
  ],
  legal: [
    { label: "Terminos y Condiciones", href: "#" },
    { label: "Politica de Privacidad", href: "#" },
    { label: "Politica de Cookies", href: "#" },
  ],
};

export function Footer({ dictionary }: { dictionary: Dictionary }) {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            py: { xs: 6, md: 8 },
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              md: "repeat(5, 1fr)",
            },
            gap: { xs: 4, md: 6 },
          }}
        >
          {/* Brand */}
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 1" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: AppColors.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {CompanyValues.name.slice(0, 2).toUpperCase()}
              </Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                {CompanyValues.name}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", mb: 3, maxWidth: 200 }}
            >
              Transformando tu descanso con la mejor ropa de cama premium desde
              2010.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {[Facebook, Instagram, Twitter, YouTube].map((Icon, index) => (
                <IconButton
                  key={index}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      color: AppColors.accent,
                      backgroundColor: alpha(AppColors.accent, 0.08),
                    },
                  }}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <Box key={title}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "text.primary",
                  mb: 2,
                  textTransform: "capitalize",
                }}
              >
                {title}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    underline="none"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.875rem",
                      transition: "color 0.2s ease",
                      "&:hover": {
                        color: AppColors.accent,
                      },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Divider />

        {/* Bottom Bar */}
        <Box
          sx={{
            py: 3,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            © 2026 {CompanyValues.name}. Todos los derechos reservados.
          </Typography>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              Pago seguro con
              <Box
                component="span"
                sx={{ fontWeight: 600, color: "text.primary" }}
              >
                PSE • Visa • Mastercard
              </Box>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
