import { z } from "zod";
export const accountProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    phone: z
      .string()
      .trim()
      .max(25)
      .refine((value) => !value || /^\+?[\d\s()-]{7,25}$/.test(value)),
  })
  .strict();
export const accountPasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    password: z.string().min(8).max(128),
  })
  .strict()
  .refine((value) => value.password !== value.currentPassword);
export const accountDeleteSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    confirmationEmail: z.string().trim().email().max(254).toLowerCase(),
  })
  .strict();
