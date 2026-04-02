/** @jest-environment node */

import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { POST } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
}));

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);

describe("POST /api/auth/resend-confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resends confirmation with a normalized email and local confirm redirect", async () => {
    const resend = jest.fn().mockResolvedValue({ error: null });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        resend,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/resend-confirmation", {
        method: "POST",
        body: JSON.stringify({
          email: "CLIENTE@example.com",
        }),
      }),
    );

    expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "cliente@example.com",
      options: {
        emailRedirectTo: "http://localhost/auth/confirm",
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        email: "cliente@example.com",
        cooldownSeconds: 60,
      },
    });
  });

  it("maps rate limiting to an explicit timeout response", async () => {
    const resend = jest.fn().mockResolvedValue({
      error: {
        status: 429,
        message:
          "For security purposes, you can only request this after a while.",
      },
    });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        resend,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/resend-confirmation", {
        method: "POST",
        body: JSON.stringify({
          email: "cliente@example.com",
        }),
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      type: "timeout",
      message: "resend_confirmation_rate_limited",
    });
  });
});
