import type { PriorityGroup } from "../types/operational";
import { PRIORITY_GROUPS } from "../types/operational";

export const BUSINESS_TIME_ZONE = "America/Bogota";
export function resolvePriorityGroup(
  value: string | undefined,
): PriorityGroup | null {
  return PRIORITY_GROUPS.find((group) => group === value) ?? null;
}
export function priorityHref(group: PriorityGroup, cursor?: string): string {
  const params = new URLSearchParams({ group });
  if (cursor) params.set("cursor", cursor);
  return `/admin/pendientes?${params}`;
}
export function operationalDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function safePriorityReturn(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  try {
    const url = new URL(value, "https://workspace.invalid");
    if (url.origin !== "https://workspace.invalid") return fallback;
    if (url.pathname === "/admin") return "/admin";
    if (url.pathname === "/admin/pendientes") {
      const group = resolvePriorityGroup(
        url.searchParams.get("group") ?? undefined,
      );
      if (group) return priorityHref(group);
    }
  } catch {
    /* Untrusted query input is not a navigation destination. */
  }
  return fallback;
}
