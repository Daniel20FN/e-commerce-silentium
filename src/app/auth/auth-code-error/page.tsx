import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AuthShell } from "@/domains/auth/components/auth_shell";
import { Alert, Stack } from "@mui/material";

export default function AuthCodeErrorPage() {
  const dictionary = getDictionary("es");

  return (
    <AuthShell
      dictionary={dictionary}
      title={dictionary.auth.authCodeError.title}
      subtitle={dictionary.auth.authCodeError.description}
    >
      <Stack spacing={2}>
        <Alert severity="error">{dictionary.auth.authCodeError.guidance}</Alert>
      </Stack>
    </AuthShell>
  );
}
