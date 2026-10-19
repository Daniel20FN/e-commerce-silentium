"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
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
} from "@mui/material";

const footerLinks = {
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

export function Footer({
  dictionary: _dictionary,
}: {
  dictionary: Dictionary;
}) {
  const linksBySection = {
    productos: [
      { label: _dictionary.storefront.allProducts, href: "/productos" },
      { label: _dictionary.storefront.allCategories, href: "/categorias" },
    ],
    ...footerLinks,
  };

  return (
    <Box
      component="footer"
      sx={(theme) => ({
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
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
                sx={(theme) => ({
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.info.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                })}
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
                  sx={(theme) => ({
                    color: "text.secondary",
                    "&:hover": {
                      color: theme.palette.info.main,
                      backgroundColor: alpha(theme.palette.info.main, 0.08),
                    },
                  })}
                >
                  <Icon fontSize="small" />
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Links */}
          {Object.entries(linksBySection).map(([title, links]) => (
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
                    sx={(theme) => ({
                      color: "text.secondary",
                      fontSize: "0.875rem",
                      transition: "color 0.2s ease",
                      "&:hover": {
                        color: theme.palette.info.main,
                      },
                    })}
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
              {_dictionary.cart.salesChannel}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
