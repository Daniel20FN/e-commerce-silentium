import { getDictionary } from "@/dictionary/services/get-dictionary";
import { brandColors } from "@/styles/brand_colors";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: getDictionary("es").storefront.brandTitle,
    template: getDictionary("es").storefront.titleTemplate,
  },
  description: getDictionary("es").storefront.brandDescription,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brandColors.ivory },
    { media: "(prefers-color-scheme: dark)", color: brandColors.darkCanvas },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
