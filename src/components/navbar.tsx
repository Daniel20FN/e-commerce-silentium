"use client";

import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { canAccessAdmin } from "@/domains/admin/services/admin_roles";
import {
  currentUserAtom,
  hasResolvedCurrentUserAtom,
} from "@/domains/auth/states/current_user_atom";
import type { LogoutApiParams } from "@/domains/auth/types/api_params";
import type { LogoutApiResponse } from "@/domains/auth/types/api_responses";
import { useThemeMode } from "@/styles/theme_context";
import { CompanyValues } from "@/values/app_values";
import {
  Close,
  DarkMode,
  Favorite,
  LightMode,
  Menu as MenuIcon,
  PersonOutline,
  Search,
  ShoppingCart,
} from "@mui/icons-material";
import {
  alpha,
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
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
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState } from "react";

const LOGOUT_REQUEST_ID = "auth-logout";

interface NavItem {
  href: string;
  label: string;
}

export function Navbar({ dictionary }: { dictionary: Dictionary }) {
  const theme = useTheme();
  const router = useRouter();
  const { cancellableApi, isPending } = useCancellableApiContext();
  const { themeMode, setThemeMode } = useThemeMode();
  const currentUser = useAtomValue(currentUserAtom);
  const hasResolvedCurrentUser = useAtomValue(hasResolvedCurrentUserAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const navItems: NavItem[] = [
    { label: dictionary.navigation.home, href: "/" },
    { label: dictionary.navigation.products, href: "/productos" },
    { label: dictionary.navigation.collections, href: "/colecciones" },
    { label: dictionary.navigation.offers, href: "/ofertas" },
    { label: dictionary.navigation.about, href: "/nosotros" },
    { label: dictionary.navigation.contact, href: "/contacto" },
  ];

  const handleDrawerToggle = (): void => {
    setMobileOpen((currentValue) => !currentValue);
  };

  const handleProfileClick = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = (): void => {
    setAnchorEl(null);
  };

  const toggleTheme = (): void => {
    setThemeMode(themeMode === "dark" ? "light" : "dark");
  };

  const handleLogout = async (): Promise<void> => {
    handleProfileClose();

    try {
      const response = await cancellableApi.post<
        LogoutApiResponse,
        LogoutApiParams
      >(LOGOUT_REQUEST_ID, "/auth/logout", {});

      setCurrentUser(null);
      router.push(response?.redirectTo ?? "/");
      router.refresh();
    } catch {
      setCurrentUser(null);
      router.push("/");
      router.refresh();
    }
  };

  const showAdminAccess = canAccessAdmin(currentUser);

  const drawerAuthButtons = currentUser ? (
    <StackedDrawerAuth
      accountLabel={dictionary.auth.navbar.account}
      adminHref={showAdminAccess ? "/admin" : undefined}
      adminLabel={
        showAdminAccess ? dictionary.admin.navigation.panel : undefined
      }
      logoutLabel={dictionary.auth.navbar.logout}
      onLogout={async () => {
        await handleLogout();
        setMobileOpen(false);
      }}
      isLoggingOut={isPending(LOGOUT_REQUEST_ID)}
    />
  ) : (
    <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      <Button
        component={Link}
        href="/login"
        variant="outlined"
        color="info"
        fullWidth
      >
        {dictionary.auth.navbar.login}
      </Button>
      <Button
        component={Link}
        href="/register"
        variant="contained"
        color="info"
        fullWidth
      >
        {dictionary.auth.navbar.register}
      </Button>
    </Box>
  );

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
              component={Link}
              href={item.href}
              sx={(theme) => ({
                py: 1.5,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.info.main, 0.08),
                },
              })}
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
      {drawerAuthButtons}
    </Box>
  );

  const displayName = currentUser?.profile.firstName ?? currentUser?.email;

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 } }}>
            <Typography
              variant="h5"
              component={Link}
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
                sx={(theme) => ({
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.info.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                })}
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
                  component={Link}
                  href={item.href}
                  sx={(theme) => ({
                    color: "text.primary",
                    fontWeight: 500,
                    px: 2,
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.info.main, 0.08),
                      color: theme.palette.info.main,
                    },
                  })}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

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

              {hasResolvedCurrentUser ? (
                currentUser ? (
                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      alignItems: "center",
                      gap: 1,
                      ml: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.primary",
                        fontWeight: 500,
                        maxWidth: 160,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayName}
                    </Typography>
                    <Tooltip title={dictionary.auth.navbar.account}>
                      <IconButton
                        onClick={handleProfileClick}
                        size="small"
                        sx={(theme) => ({
                          border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                          backgroundColor: alpha(theme.palette.info.main, 0.08),
                          "&:hover": {
                            backgroundColor: alpha(
                              theme.palette.info.main,
                              0.16,
                            ),
                          },
                        })}
                      >
                        <Avatar
                          sx={(theme) => ({
                            width: 32,
                            height: 32,
                            fontSize: 14,
                            bgcolor: theme.palette.info.main,
                            color: "#fff",
                          })}
                        >
                          {(displayName ?? dictionary.auth.navbar.hello)
                            .slice(0, 1)
                            .toUpperCase()}
                        </Avatar>
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      alignItems: "center",
                      ml: 0.5,
                    }}
                  >
                    <Tooltip title={dictionary.auth.navbar.account}>
                      <IconButton
                        onClick={handleProfileClick}
                        aria-label={dictionary.auth.navbar.account}
                        sx={(theme) => ({
                          color: "text.primary",
                          border: `1px solid ${alpha(
                            theme.palette.text.primary,
                            0.18,
                          )}`,
                          "&:hover": {
                            backgroundColor: alpha(
                              theme.palette.text.primary,
                              0.06,
                            ),
                          },
                        })}
                      >
                        <PersonOutline />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )
              ) : (
                <Box
                  sx={{
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                    px: 2,
                  }}
                >
                  <CircularProgress size={20} />
                </Box>
              )}

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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 220,
              borderRadius: 2,
            },
          },
        }}
      >
        {currentUser
          ? [
              <MenuItem
                key="account"
                component={Link}
                href="/account"
                onClick={handleProfileClose}
              >
                {dictionary.auth.navbar.account}
              </MenuItem>,
              <MenuItem
                key="orders"
                component={Link}
                href="/account/orders"
                onClick={handleProfileClose}
              >
                {dictionary.auth.navbar.orders}
              </MenuItem>,
              <MenuItem
                key="wishlist"
                component={Link}
                href="/account/wishlist"
                onClick={handleProfileClose}
              >
                {dictionary.auth.navbar.wishlist}
              </MenuItem>,
              showAdminAccess ? (
                <MenuItem
                  key="admin"
                  component={Link}
                  href="/admin"
                  onClick={handleProfileClose}
                >
                  {dictionary.admin.navigation.panel}
                </MenuItem>
              ) : null,
              <Divider key="divider" />,
              <MenuItem
                key="logout"
                onClick={() => void handleLogout()}
                disabled={isPending(LOGOUT_REQUEST_ID)}
              >
                {dictionary.auth.navbar.logout}
              </MenuItem>,
            ]
          : [
              <MenuItem
                key="login"
                component={Link}
                href="/login"
                onClick={handleProfileClose}
              >
                {dictionary.auth.navbar.login}
              </MenuItem>,
              <Divider key="divider" />,
              <MenuItem
                key="register"
                component={Link}
                href="/register"
                onClick={handleProfileClose}
              >
                {dictionary.auth.navbar.register}
              </MenuItem>,
            ]}
      </Menu>

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

      <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }} />
    </>
  );
}

interface StackedDrawerAuthProps {
  accountLabel: string;
  adminHref?: string;
  adminLabel?: string;
  logoutLabel: string;
  isLoggingOut: boolean;
  onLogout: () => Promise<void>;
}

function StackedDrawerAuth({
  accountLabel,
  adminHref,
  adminLabel,
  logoutLabel,
  isLoggingOut,
  onLogout,
}: StackedDrawerAuthProps) {
  return (
    <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      <Button component={Link} href="/account" variant="contained" fullWidth>
        {accountLabel}
      </Button>
      {adminHref && adminLabel ? (
        <Button component={Link} href={adminHref} variant="outlined" fullWidth>
          {adminLabel}
        </Button>
      ) : null}
      <Button
        onClick={() => void onLogout()}
        variant="outlined"
        fullWidth
        disabled={isLoggingOut}
      >
        {logoutLabel}
      </Button>
    </Box>
  );
}
