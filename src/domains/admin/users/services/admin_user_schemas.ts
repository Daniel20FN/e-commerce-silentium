import {
  ADMIN_USER_PAGE_SIZE_OPTIONS,
  ADMIN_USER_ROLE_VALUES,
  ADMIN_USER_SORT_DIRECTION_VALUES,
  ADMIN_USER_SORT_FIELD_VALUES,
  ADMIN_USER_STATUS_VALUES,
} from "@/domains/admin/users/types/shared";
import { z } from "zod";

const DEFAULT_PAGE_SIZE = ADMIN_USER_PAGE_SIZE_OPTIONS[0];

export const adminUsersListParamsSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce
    .number()
    .int()
    .refine(
      (value) => ADMIN_USER_PAGE_SIZE_OPTIONS.includes(value as 10 | 25 | 50),
      {
        error: "invalid_page_size",
      },
    )
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).optional().default(""),
  role: z.enum(ADMIN_USER_ROLE_VALUES).optional(),
  status: z.enum(ADMIN_USER_STATUS_VALUES).optional(),
  sortField: z.enum(ADMIN_USER_SORT_FIELD_VALUES).default("createdAt"),
  sortDirection: z.enum(ADMIN_USER_SORT_DIRECTION_VALUES).default("desc"),
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(ADMIN_USER_ROLE_VALUES).optional(),
    status: z.enum(ADMIN_USER_STATUS_VALUES).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    error: "admin_user_update_required",
  });
