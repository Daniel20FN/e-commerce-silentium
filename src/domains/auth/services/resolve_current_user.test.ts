import { AuthApiError, AuthSessionMissingError } from "@supabase/supabase-js";
import { resolveCurrentUser } from "./resolve_current_user";

jest.mock("./sync_auth_user", () => ({ syncAuthUser: jest.fn() }));

describe("resolveCurrentUser session boundaries", () => {
  it.each([
    new AuthSessionMissingError(),
    new AuthApiError("Refresh token not found", 400, "refresh_token_not_found"),
  ])("returns null for an expired or missing session", async (error) => {
    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error }),
      },
    };
    await expect(resolveCurrentUser(client)).resolves.toBeNull();
  });

  it("handles a thrown missing-session error", async () => {
    const client = {
      auth: {
        getUser: jest.fn().mockRejectedValue(new AuthSessionMissingError()),
      },
    };
    await expect(resolveCurrentUser(client)).resolves.toBeNull();
  });

  it("preserves unexpected authentication failures instead of treating them as logout", async () => {
    const error = new AuthApiError("Service unavailable", 503, undefined);
    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error }),
      },
    };
    await expect(resolveCurrentUser(client)).rejects.toBe(error);
  });
});
