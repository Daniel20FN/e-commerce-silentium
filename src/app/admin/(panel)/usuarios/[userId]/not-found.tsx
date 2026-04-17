import { getDictionary } from "@/dictionary/services/get-dictionary";
import { Button, Stack, Typography } from "@mui/material";

export default function AdminUserNotFound() {
  const dictionary = getDictionary("es");

  return (
    <Stack spacing={2}>
      <Typography variant="h5">
        {dictionary.admin.users.detail.title}
      </Typography>
      <Typography color="text.secondary">
        {dictionary.admin.users.detail.notFound}
      </Typography>
      <Button
        href="/admin/usuarios"
        variant="contained"
        sx={{ alignSelf: "flex-start" }}
      >
        {dictionary.admin.users.detail.back}
      </Button>
    </Stack>
  );
}
