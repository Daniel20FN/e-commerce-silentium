"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type { CurrentUserDto } from "@/domains/auth/types/current_user";
import {
  ChevronLeft,
  ChevronRight,
  DashboardOutlined,
  Menu as MenuIcon,
  StorefrontOutlined,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar as MuiAppBar,
  Drawer as MuiDrawer,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import type { CSSObject, Theme } from "@mui/material/styles";
import { styled, useTheme } from "@mui/material/styles";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

const DRAWER_WIDTH = 240;

const getClosedDrawerWidth = (theme: Theme): string =>
  `calc(${theme.spacing(7)} + 1px)`;

const getClosedDrawerWidthUpSm = (theme: Theme): string =>
  `calc(${theme.spacing(8)} + 1px)`;

const openedMixin = (theme: Theme): CSSObject => ({
  width: DRAWER_WIDTH,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: getClosedDrawerWidth(theme),
  [theme.breakpoints.up("sm")]: {
    width: getClosedDrawerWidthUpSm(theme),
  },
});

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<{ open: boolean }>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: open
      ? theme.transitions.duration.enteringScreen
      : theme.transitions.duration.leavingScreen,
  }),
  ...(open
    ? {
        marginLeft: DRAWER_WIDTH,
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
      }
    : {
        marginLeft: getClosedDrawerWidth(theme),
        width: `calc(100% - ${getClosedDrawerWidth(theme)})`,
        [theme.breakpoints.up("sm")]: {
          marginLeft: getClosedDrawerWidthUpSm(theme),
          width: `calc(100% - ${getClosedDrawerWidthUpSm(theme)})`,
        },
      }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})<{ open: boolean }>(({ theme, open }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

interface AdminShellProps {
  children: ReactNode;
  dictionary: Dictionary;
  currentUser: CurrentUserDto;
}

interface AdminNavigationItem {
  href: string;
  icon: ReactNode;
  label: string;
}

export function AdminShell({
  children,
  dictionary,
  currentUser,
}: AdminShellProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const navigationItems: AdminNavigationItem[] = [
    {
      href: "/admin",
      icon: <DashboardOutlined />,
      label: dictionary.admin.navigation.dashboard,
    },
    {
      href: "/",
      icon: <StorefrontOutlined />,
      label: dictionary.admin.navigation.storefront,
    },
  ];

  const displayName = currentUser.profile.firstName ?? currentUser.email;

  return (
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      <AppBar
        open={open}
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {dictionary.admin.layout.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dictionary.admin.dashboard.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ bgcolor: "info.main", color: "#fff" }}>
              {displayName.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dictionary.admin.layout.welcome}
              </Typography>
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader sx={{ justifyContent: open ? "flex-end" : "center" }}>
          <Tooltip
            title={
              open
                ? dictionary.admin.layout.collapse
                : dictionary.admin.layout.expand
            }
          >
            <IconButton
              aria-label={
                open
                  ? dictionary.admin.layout.collapse
                  : dictionary.admin.layout.menu
              }
              onClick={() => setOpen((currentValue) => !currentValue)}
            >
              {open ? (
                theme.direction === "rtl" ? (
                  <ChevronRight />
                ) : (
                  <ChevronLeft />
                )
              ) : (
                <MenuIcon />
              )}
            </IconButton>
          </Tooltip>
        </DrawerHeader>
        <Divider />
        <List>
          {navigationItems.map((item) => (
            <ListItem key={item.href} disablePadding sx={{ display: "block" }}>
              <ListItemButton
                component={Link}
                href={item.href}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  justifyContent: open ? "initial" : "center",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{ opacity: open ? 1 : 0 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          height: "100dvh",
          overflow: "hidden",
          backgroundColor: "background.default",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <DrawerHeader />
        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            overflow: "auto",
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
