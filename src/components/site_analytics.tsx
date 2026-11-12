"use client";

import { Analytics } from "@vercel/analytics/next";
import { redactAnalyticsEvent } from "./analytics_redaction";

/** Vercel Web Analytics with private-route URL redaction. */
export function SiteAnalytics() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
