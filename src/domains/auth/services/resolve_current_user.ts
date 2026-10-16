import type {
  AuthError,
  User as SupabaseAuthUser,
} from "@supabase/supabase-js";
import type { CurrentUserDto } from "../types/current_user";
import { sanitizeCurrentUser } from "./sanitize_current_user";
import { syncAuthUser } from "./sync_auth_user";

interface SupabaseAuthReader {
  auth: {
    getUser: () => Promise<{
      data: {
        user: SupabaseAuthUser | null;
      };
      error: AuthError | null;
    }>;
  };
}

export async function resolveCurrentUser(
  supabase: SupabaseAuthReader,
): Promise<CurrentUserDto | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      return null;
    }

    const businessUser = await syncAuthUser({
      authUser: user,
    });

    return sanitizeCurrentUser(businessUser);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AuthSessionMissingError" ||
        ("code" in error &&
          (error.code === "refresh_token_not_found" ||
            error.code === "refresh_token_already_used" ||
            error.code === "session_not_found")))
    ) {
      return null;
    }
    throw error;
  }
}
