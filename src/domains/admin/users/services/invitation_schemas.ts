import { z } from "zod";
import { ADMIN_USER_ROLE_VALUES } from "../types/shared";

export const userInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    role: z.enum(ADMIN_USER_ROLE_VALUES),
  })
  .strict();

export const acceptInvitationSchema = z
  .object({
    password: z.string().min(8).max(128),
    acceptTerms: z.literal(true),
  })
  .strict();
