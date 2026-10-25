import {
  searchIndexingEnabled,
  storefrontUrl,
} from "@/domains/storefront/services/seo_rules";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return searchIndexingEnabled()
    ? {
        rules: { userAgent: "*", allow: "/", disallow: "/api/" },
        sitemap: storefrontUrl("/sitemap.xml"),
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
