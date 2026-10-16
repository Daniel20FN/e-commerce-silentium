/** @jest-environment node */

import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { updateSupabaseSession } from "./middleware";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

const mockCreateServerClient = jest.mocked(createServerClient);
const mockGetUser = jest.fn();

describe("updateSupabaseSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    } as never);
  });

  it("clears stale Supabase cookies when getUser returns refresh_token_not_found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: {
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
      },
    });
    const request = new NextRequest("http://localhost/api/auth/me", {
      headers: {
        cookie: "sb-project-auth-token=stale-token; unrelated-cookie=keep-me",
      },
    });

    const result = await updateSupabaseSession(request);

    expect(result.userId).toBeNull();
    expect(result.response.cookies.get("sb-project-auth-token")?.value).toBe(
      "",
    );
    expect(result.response.cookies.get("unrelated-cookie")).toBeUndefined();
  });

  it("clears stale Supabase cookies when getUser throws the refresh error", async () => {
    mockGetUser.mockRejectedValue(
      Object.assign(
        new Error("Invalid Refresh Token: Refresh Token Not Found"),
        { code: "refresh_token_not_found" },
      ),
    );
    const request = new NextRequest("http://localhost/api/auth/me", {
      headers: { cookie: "sb-project-auth-token=stale-token" },
    });

    const result = await updateSupabaseSession(request);

    expect(result.userId).toBeNull();
    expect(result.response.cookies.get("sb-project-auth-token")?.value).toBe(
      "",
    );
  });
});
