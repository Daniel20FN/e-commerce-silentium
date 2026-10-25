import { NO_INDEX } from "@/domains/storefront/services/seo_rules";
export const metadata = { robots: NO_INDEX };

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
