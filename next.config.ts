import type { NextConfig } from "next";
import withPWA from "next-pwa";
import packageJson from "./package.json";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@mui/material",
    "@mui/icons-material",
    "@emotion/react",
    "@emotion/styled",
    "next-auth",
  ],
  images: {
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [
            new URL(
              `/storage/v1/object/public/${process.env.SUPABASE_STORAGE_CATALOG_BUCKET ?? "catalog-public-images"}/**`,
              process.env.NEXT_PUBLIC_SUPABASE_URL,
            ),
          ]
        : []),
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  experimental: {
    webpackBuildWorker: true,
    inlineCss: true,
  },
  outputFileTracingExcludes: {
    // Avoids including canvas in the trace to avoid 50 Mb+ serverless functions
    "*": ["node_modules/canvas"],
  },
  turbopack: {},
  async redirects() {
    return [
      { source: "/nosotros", destination: "/#nosotros", permanent: true },
      { source: "/contacto", destination: "/#contacto", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/account/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/auth/invitacion",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/api/apps/get-app-config",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
