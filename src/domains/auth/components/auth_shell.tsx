"use client";

import type { Dictionary } from "@/dictionary/services/get-dictionary";
import { ArrowBack } from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  dictionary: Dictionary;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({
  dictionary,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        backgroundImage: `linear-gradient(135deg, ${alpha(
          theme.palette.mode === "dark"
            ? theme.palette.background.paper
            : theme.palette.primary.main,
          0.98,
        )} 0%, ${alpha(
          theme.palette.mode === "dark"
            ? theme.palette.secondary.main
            : theme.palette.info.main,
          0.88,
        )} 100%)`,
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Link href="/" style={{ textDecoration: "none" }}>
                <Button startIcon={<ArrowBack />} sx={{ mb: 2, px: 0 }}>
                  {dictionary.general.backToHome}
                </Button>
              </Link>
              <Typography variant="h3" sx={{ mb: 1 }}>
                {title}
              </Typography>
              <Typography color="text.secondary">{subtitle}</Typography>
            </Box>
            {children}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
