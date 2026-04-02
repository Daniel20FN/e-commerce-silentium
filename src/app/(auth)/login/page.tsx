import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AuthShell } from "@/domains/auth/components/auth_shell";
import { LoginForm } from "@/domains/auth/components/login_form";

export default function LoginPage() {
  const dictionary = getDictionary("es");

  return (
    <AuthShell
      dictionary={dictionary}
      title={dictionary.auth.login.title}
      subtitle={dictionary.auth.login.subtitle}
    >
      <LoginForm dictionary={dictionary} />
    </AuthShell>
  );
}
