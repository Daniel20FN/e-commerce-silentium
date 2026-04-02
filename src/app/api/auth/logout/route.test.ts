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

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs out and returns a sanitized redirect", async () => {
    const signOut = jest.fn().mockResolvedValue({ error: null });

    mockCreateRouteHandlerSupabaseClient.mockReturnValue({
      auth: {
        signOut,
      },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({
          redirectTo: "https://evil.example/steal-session",
        }),
      }),
    );

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        success: true,
        redirectTo: "/",
      },
    });
  });
});
