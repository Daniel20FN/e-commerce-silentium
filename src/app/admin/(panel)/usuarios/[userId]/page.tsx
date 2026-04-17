import { getDictionary } from "@/dictionary/services/get-dictionary";
import {
  formatAdminDateTimeFromDate,
  getAdminRoleLabel,
  getAdminStatusLabel,
} from "@/domains/admin/users/services/admin_user_formatters";
import { getAdminUserDetail } from "@/domains/admin/users/services/admin_user_queries";
import { ArrowBackOutlined } from "@mui/icons-material";
import { Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";

interface AdminUserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

interface DetailItemProps {
  label: string;
  value: string;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, wordBreak: "break-word" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const dictionary = getDictionary("es");
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);

  if (!user) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Button
          href="/admin/usuarios"
          variant="text"
          startIcon={<ArrowBackOutlined />}
          sx={{ alignSelf: "flex-start", px: 0 }}
        >
          {dictionary.admin.users.detail.back}
        </Button>
        <Typography
          variant="overline"
          color="info.main"
          sx={{ fontWeight: 700 }}
        >
          {dictionary.admin.users.title}
        </Typography>
        <Typography variant="h4">{user.fullName}</Typography>
        <Typography color="text.secondary">
          {dictionary.admin.users.detail.subtitle}
        </Typography>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Stack spacing={2}>
              <Typography variant="h6">
                {dictionary.admin.users.detail.sections.account}
              </Typography>
              <DetailItem
                label={dictionary.admin.users.detail.fields.userId}
                value={user.id}
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.authUserId}
                value={
                  user.authUserId ?? dictionary.admin.users.detail.notAvailable
                }
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.email}
                value={user.email}
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.role}
                value={getAdminRoleLabel(dictionary, user.role)}
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.status}
                value={getAdminStatusLabel(dictionary, user.status)}
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.emailVerified}
                value={
                  user.emailVerified
                    ? dictionary.admin.users.detail.verified
                    : dictionary.admin.users.detail.notVerified
                }
              />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Stack spacing={2}>
              <Typography variant="h6">
                {dictionary.admin.users.detail.sections.profile}
              </Typography>
              <DetailItem
                label={dictionary.admin.users.detail.fields.fullName}
                value={user.fullName}
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.firstName}
                value={
                  user.firstName ?? dictionary.admin.users.detail.notAvailable
                }
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.lastName}
                value={
                  user.lastName ?? dictionary.admin.users.detail.notAvailable
                }
              />
              <DetailItem
                label={dictionary.admin.users.detail.fields.phone}
                value={user.phone ?? dictionary.admin.users.detail.notAvailable}
              />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">
                {dictionary.admin.users.detail.sections.activity}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DetailItem
                    label={dictionary.admin.users.detail.fields.createdAt}
                    value={formatAdminDateTimeFromDate(user.createdAt)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DetailItem
                    label={dictionary.admin.users.detail.fields.updatedAt}
                    value={formatAdminDateTimeFromDate(user.updatedAt)}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DetailItem
                    label={dictionary.admin.users.detail.fields.lastAccessAt}
                    value={formatAdminDateTimeFromDate(user.lastAccessAt)}
                  />
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
