import type { Dictionary } from "@/dictionary/services/get-dictionary";
import type {
  AdminUserRole,
  AdminUserStatus,
} from "@/domains/admin/users/types/shared";

export function formatAdminDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAdminDateTimeFromDate(value: Date | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function getAdminRoleLabel(
  dictionary: Dictionary,
  role: AdminUserRole,
): string {
  return dictionary.admin.users.roleLabels[role];
}

export function getAdminStatusLabel(
  dictionary: Dictionary,
  status: AdminUserStatus,
): string {
  return dictionary.admin.users.statusLabels[status];
}
