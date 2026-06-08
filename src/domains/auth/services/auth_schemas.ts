import { z } from "zod";

export const registerSchema = z.object({
  email: z.email({ error: "invalid_email" }),
  password: z.string().min(8, { error: "password_min_length" }),
  firstName: z.string().trim().min(1, { error: "first_name_required" }),
  lastName: z.string().trim().min(1, { error: "last_name_required" }),
  acceptTerms: z.literal(true, {
    error: "accept_terms_required",
  }),
  acceptsMarketingEmails: z.boolean().optional().default(false),
  acceptsWhatsAppMarketing: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.email({ error: "invalid_email" }),
  password: z.string().min(1, { error: "required_field" }),
  returnTo: z.string().optional(),
});

export const logoutSchema = z.object({
  redirectTo: z.string().optional(),
});

export const confirmSchema = z.object({
  token_hash: z.string().min(1, { error: "missing_token_hash" }),
  type: z.enum(["email", "signup", "invite", "recovery", "email_change"]),
  next: z.string().optional(),
});

export const resendConfirmationSchema = z.object({
  email: z.email({ error: "invalid_email" }),
});
