const SUPABASE_ENV_KEYS = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  legacyAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  secretKey: "SUPABASE_SECRET_KEY",
  legacySecretKey: "SUPABASE_SERVICE_ROLE_KEY",
} as const;

function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();

  return value ? value : undefined;
}

export function getSupabaseUrl(): string {
  return getRequiredEnv(SUPABASE_ENV_KEYS.url);
}

export function getSupabasePublishableKey(): string {
  return (
    getOptionalEnv(SUPABASE_ENV_KEYS.publishableKey) ??
    getRequiredEnv(SUPABASE_ENV_KEYS.legacyAnonKey)
  );
}

export function getSupabaseSecretKey(): string {
  return (
    getOptionalEnv(SUPABASE_ENV_KEYS.secretKey) ??
    getRequiredEnv(SUPABASE_ENV_KEYS.legacySecretKey)
  );
}
