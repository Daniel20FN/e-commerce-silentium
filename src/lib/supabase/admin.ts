import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "./shared";

export function createSupabaseAdminClient(
  timeoutMs?: number,
): ReturnType<typeof createClient> {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(timeoutMs
      ? {
          global: {
            fetch: (input: RequestInfo | URL, init?: RequestInit) =>
              fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
          },
        }
      : {}),
  });
}
