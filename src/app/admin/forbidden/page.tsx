import { getDictionary } from "@/dictionary/services/get-dictionary";
import { LockOutlined } from "@mui/icons-material";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export default function AdminForbiddenPage() {
  const dictionary = getDictionary("es");

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        backgroundColor: "background.default",
        py: 6,
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={3} alignItems="flex-start">
            <LockOutlined color="error" sx={{ fontSize: 40 }} />
            <Box>
              <Typography
                variant="overline"
                color="error"
                sx={{ fontWeight: 700 }}
              >
                {dictionary.admin.forbidden.eyebrow}
              </Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>
                {dictionary.admin.forbidden.title}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                {dictionary.admin.forbidden.description}
              </Typography>
            </Box>
            <Button href="/" variant="contained">
              {dictionary.admin.forbidden.action}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
