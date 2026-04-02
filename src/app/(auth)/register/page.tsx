import { getDictionary } from "@/dictionary/services/get-dictionary";
import { AuthShell } from "@/domains/auth/components/auth_shell";
import { RegisterForm } from "@/domains/auth/components/register_form";

export default function RegisterPage() {
  const dictionary = getDictionary("es");

  return (
    <AuthShell
      dictionary={dictionary}
      title={dictionary.auth.register.title}
      subtitle={dictionary.auth.register.subtitle}
    >
      <RegisterForm dictionary={dictionary} />
    </AuthShell>
  );
}
