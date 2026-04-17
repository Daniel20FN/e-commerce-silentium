import { getDictionary } from "@/dictionary/services/get-dictionary";
import { Box, Grid, Paper, Stack, Typography } from "@mui/material";

interface AdminDashboardCard {
  description: string;
  title: string;
}

export default async function AdminDashboardPage() {
  const dictionary = getDictionary("es");

  const cards: AdminDashboardCard[] = [
    {
      title: dictionary.admin.dashboard.cards.catalogTitle,
      description: dictionary.admin.dashboard.cards.catalogDescription,
    },
    {
      title: dictionary.admin.dashboard.cards.ordersTitle,
      description: dictionary.admin.dashboard.cards.ordersDescription,
    },
    {
      title: dictionary.admin.dashboard.cards.customersTitle,
      description: dictionary.admin.dashboard.cards.customersDescription,
    },
    {
      title: dictionary.admin.dashboard.cards.settingsTitle,
      description: dictionary.admin.dashboard.cards.settingsDescription,
    },
  ];

  return (
    <Box>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 2, md: 2.5 },
            border: 1,
            borderColor: "divider",
            boxShadow: "none",
          }}
        >
          <Stack spacing={0.75}>
            <Typography
              variant="overline"
              color="info.main"
              sx={{ fontWeight: 700 }}
            >
              {dictionary.admin.dashboard.eyebrow}
            </Typography>
            <Typography variant="h6">
              {dictionary.admin.dashboard.summaryTitle}
            </Typography>
            <Typography color="text.secondary">
              {dictionary.admin.dashboard.summaryDescription}
            </Typography>
          </Stack>
        </Paper>

        <Grid container spacing={3} sx={{ alignContent: "flex-start" }}>
          {cards.map((card) => (
            <Grid key={card.title} size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Stack spacing={1.5}>
                  <Typography variant="h6">{card.title}</Typography>
                  <Typography color="text.secondary">
                    {card.description}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}
