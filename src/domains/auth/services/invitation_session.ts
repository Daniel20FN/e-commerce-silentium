import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export async function establishInvitationSession(): Promise<void> {
  if (typeof window === "undefined") throw new Error("invitation_unavailable");
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const access = fragment.get("access_token");
  const refresh = fragment.get("refresh_token");
  // Bearer credentials must not remain in the visible URL or error reporting.
  if (window.location.hash)
    window.history.replaceState(null, "", window.location.pathname);
  if (fragment.has("error") || fragment.has("error_code"))
    throw new Error("invitation_unavailable");
  if (!access && !refresh) return;
  if (!access || !refresh) throw new Error("invitation_unavailable");
  const { error } = await createBrowserSupabaseClient().auth.setSession({
    access_token: access,
    refresh_token: refresh,
  });
  if (error) throw new Error("invitation_unavailable");
}
