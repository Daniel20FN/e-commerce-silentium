import {
  Box,
  Container,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

export function RouteLoading({ label }: { label: string }) {
  return (
    <Container
      maxWidth="lg"
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{ minHeight: "55vh", py: 4 }}
    >
      <Stack spacing={3}>
        <Typography color="text.secondary">{label}</Typography>
        <LinearProgress
          aria-hidden="true"
          sx={{
            "@media (prefers-reduced-motion: reduce)": {
              "& .MuiLinearProgress-bar": { animation: "none" },
            },
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" },
            gap: { xs: 2, md: 3 },
          }}
        >
          {[0, 1, 2].map((item) => (
            <Skeleton
              key={item}
              variant="rounded"
              animation={false}
              sx={{
                aspectRatio: "1",
                height: "auto",
                "&:last-child": { display: { xs: "none", md: "block" } },
              }}
            />
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
