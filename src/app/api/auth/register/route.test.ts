/** @jest-environment node */

import { syncAuthUser } from "@/domains/auth/services/sync_auth_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { POST } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
}));

jest.mock("@/domains/auth/services/sync_auth_user", () => ({
  syncAuthUser: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockSyncAuthUser = jest.mocked(syncAuthUser);

function createSupabaseUser(overrides?: Partial<User>): User {
  return {
    id: "auth-user-1",
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-04-02T00:00:00.000Z",
    email: "cliente@example.com",
    email_confirmed_at: null,
    ...overrides,
  } as User;
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns pending-confirmation success and provisions linkage", async () => {
    const signUp = jest.fn().mockResolvedValue({
      data: {
        user: createSupabaseUser(),
        session: null,
      },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        signUp,
        signOut,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "CLIENTE@example.com",
          password: "password123",
          firstName: " Ana ",
          lastName: " Pérez ",
          acceptTerms: true,
        }),
      }),
    );

    expect(signUp).toHaveBeenCalledWith({
      email: "cliente@example.com",
      password: "password123",
      options: {
        emailRedirectTo: "http://localhost/auth/confirm",
        data: {
          first_name: "Ana",
          last_name: "Pérez",
        },
      },
    });
    expect(mockSyncAuthUser).toHaveBeenCalledWith({
      authUser: expect.objectContaining({
        id: "auth-user-1",
        email: "cliente@example.com",
      }),
      profile: {
        firstName: "Ana",
        lastName: "Pérez",
      },
      acceptedTermsAt: expect.any(Date),
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        requiresEmailConfirmation: true,
        email: "cliente@example.com",
      },
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns validation errors before reaching Supabase", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "short",
          firstName: "",
          lastName: "Pérez",
          acceptTerms: false,
        }),
      }),
    );

    expect(mockCreateRouteHandlerSupabaseClient).not.toHaveBeenCalled();
    expect(mockSyncAuthUser).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: "invalid_email",
    });
  });

  it("maps duplicate email conflicts to an explicit conflict response", async () => {
    const signUp = jest.fn().mockResolvedValue({
      data: {
        user: null,
        session: null,
      },
      error: {
        message: "User already registered",
      },
    });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        signUp,
        signOut: jest.fn(),
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "cliente@example.com",
          password: "password123",
          firstName: "Ana",
          lastName: "Pérez",
          acceptTerms: true,
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      type: "conflict",
      message: "email_already_registered",
    });
    expect(mockSyncAuthUser).not.toHaveBeenCalled();
  });

  it("fails explicitly when signup auto-confirms or creates a session", async () => {
    const signUp = jest.fn().mockResolvedValue({
      data: {
        user: createSupabaseUser({
          email_confirmed_at: "2026-04-02T00:00:00.000Z",
        }),
        session: {
          access_token: "token",
        },
      },
      error: null,
    });
    const signOut = jest.fn().mockResolvedValue({ error: null });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        signUp,
        signOut,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "cliente@example.com",
          password: "password123",
          firstName: "Ana",
          lastName: "Pérez",
          acceptTerms: true,
        }),
      }),
    );

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mockSyncAuthUser).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      type: "internal_server_error",
      message: "email_confirmation_misconfigured",
    });
  });
});
