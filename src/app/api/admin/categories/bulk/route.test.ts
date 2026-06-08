/** @jest-environment node */

import { applyAdminCategoryBulkAction } from "@/domains/admin/categories/services/admin_category_mutations";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { UserRole, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: jest.fn(),
  copySupabaseResponseCookies: jest.fn(
    <T>(source: NextResponse, target: NextResponse<T>): NextResponse<T> => {
      source.cookies.getAll().forEach((cookie) => {
        target.cookies.set(cookie.name, cookie.value, cookie);
      });

      return target;
    },
  ),
}));

jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));

jest.mock(
  "@/domains/admin/categories/services/admin_category_mutations",
  () => ({
    applyAdminCategoryBulkAction: jest.fn(),
  }),
);

const mockCreateRouteHandlerSupabaseClient = jest.mocked(
  createRouteHandlerSupabaseClient,
);
const mockResolveCurrentUser = jest.mocked(resolveCurrentUser);
const mockApplyAdminCategoryBulkAction = jest.mocked(
  applyAdminCategoryBulkAction,
);

describe("POST /api/admin/categories/bulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRouteHandlerSupabaseClient.mockReturnValue({ auth: {} } as never);
    mockResolveCurrentUser.mockResolvedValue({
      id: "admin-1",
      authUserId: "auth-admin-1",
      email: "admin@example.com",
      role: UserRole.admin,
      status: UserStatus.active,
      emailVerified: true,
      profile: {
        firstName: "Ada",
        lastName: "Admin",
      },
    });
  });

  it("returns partial bulk report", async () => {
    mockApplyAdminCategoryBulkAction.mockResolvedValue({
      processed: 2,
      successCount: 1,
      exceptions: [
        {
          categoryId: "cat-2",
          type: "not_found",
          message: "record_not_found",
        },
      ],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: "restore",
          categoryIds: ["cat-1", "cat-2"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        processed: 2,
        successCount: 1,
        exceptions: [
          {
            categoryId: "cat-2",
            type: "not_found",
            message: "record_not_found",
          },
        ],
      },
    });
  });

  it("returns 400 when payload is invalid", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: "archive",
          categoryIds: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      type: "validation_error",
      message: expect.any(String),
    });
  });

  it("returns 401 for unauthenticated user", async () => {
    mockResolveCurrentUser.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/admin/categories/bulk", {
        method: "POST",
        body: JSON.stringify({
          action: "restore",
          categoryIds: ["cat-1"],
        }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
