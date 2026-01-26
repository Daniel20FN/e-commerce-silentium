"use client";

import { Dictionary } from "@/dictionary/services/get-dictionary";
import { AppColors } from "@/styles/mui_theme";
import { useThemeMode } from "@/styles/theme_context";
import { CompanyValues } from "@/values/app_values";
import {
  Close,
  DarkMode,
  Favorite,
  LightMode,
  Menu as MenuIcon,
  Person,
  Search,
  ShoppingCart,
} from "@mui/icons-material";
import {
  alpha,
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import * as React from "react";

const navItems = [
  { label: "Inicio", href: "/" },
  { label: "Productos", href: "/productos" },
  { label: "Colecciones", href: "/colecciones" },
  { label: "Ofertas", href: "/ofertas" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Contacto", href: "/contacto" },
];

export function Navbar({ dictionary }: { dictionary: Dictionary }) {
  // Hooks
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeMode();
  // States
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === "dark" ? "light" : "dark");
  };

  const drawer = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          {CompanyValues.name}
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <Close />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              sx={{
                py: 1.5,
                "&:hover": {
                  backgroundColor: alpha(AppColors.accent, 0.08),
                },
              }}
            >
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    fontWeight: 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ px: 2 }}>
        <Button
          variant="contained"
          fullWidth
          sx={{
            mb: 1,
            backgroundColor: AppColors.accent,
            "&:hover": {
              backgroundColor: AppColors.accentDark,
            },
          }}
        >
          Iniciar Sesión
        </Button>
        <Button variant="outlined" fullWidth color="primary">
          Crear Cuenta
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor:
            theme.palette.mode === "dark"
              ? alpha(AppColors.primary, 0.95)
              : alpha("#ffffff", 0.95),
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
            {/* Logo */}
            <Typography
              variant="h5"
              component="a"
              href="/"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                textDecoration: "none",
                mr: 4,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
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
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {CompanyValues.name.slice(0, 2).toUpperCase()}
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                {CompanyValues.name}
              </Box>
            </Typography>

            {/* Desktop Navigation */}
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "none", md: "flex" },
                gap: 1,
              }}
            >
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  sx={{
                    color: "text.primary",
                    fontWeight: 500,
                    px: 2,
                    "&:hover": {
                      backgroundColor: alpha(AppColors.accent, 0.08),
                      color: AppColors.accent,
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            {/* Actions */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton
                sx={{
                  color: "text.primary",
                  display: { xs: "none", sm: "flex" },
                }}
              >
                <Search />
              </IconButton>

              <IconButton onClick={toggleTheme} sx={{ color: "text.primary" }}>
                {themeMode === "dark" ? <LightMode /> : <DarkMode />}
              </IconButton>

              <IconButton
                sx={{
                  color: "text.primary",
                  display: { xs: "none", sm: "flex" },
                }}
              >
                <Badge badgeContent={2} color="error">
                  <Favorite />
                </Badge>
              </IconButton>

              <IconButton sx={{ color: "text.primary" }}>
                <Badge badgeContent={3} color="error">
                  <ShoppingCart />
                </Badge>
              </IconButton>

              <IconButton
                onClick={handleProfileClick}
                sx={{
                  color: "text.primary",
                  display: { xs: "none", md: "flex" },
                }}
              >
                <Person />
              </IconButton>

              <IconButton
                sx={{ display: { md: "none" }, color: "text.primary" }}
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
            },
          },
        }}
      >
        <MenuItem onClick={handleProfileClose}>Iniciar Sesion</MenuItem>
        <MenuItem onClick={handleProfileClose}>Crear Cuenta</MenuItem>
        <Divider />
        <MenuItem onClick={handleProfileClose}>Mi Perfil</MenuItem>
        <MenuItem onClick={handleProfileClose}>Mis Pedidos</MenuItem>
        <MenuItem onClick={handleProfileClose}>Lista de Deseos</MenuItem>
      </Menu>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Spacer for fixed AppBar */}
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }} />
    </>
  );
}
