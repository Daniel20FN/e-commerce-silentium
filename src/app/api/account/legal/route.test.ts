/** @jest-environment node */
import { GET as adminEvidence } from "@/app/api/admin/legal/evidence/route";
import { resolveCurrentUser } from "@/domains/auth/services/resolve_current_user";
import {
  readLegalPreferences,
  saveLegalPreferences,
} from "@/domains/legal/services/consent_service";
import { readLegalEvidence } from "@/domains/legal/services/legal_evidence";
import { NextRequest } from "next/server";
import { GET as ownEvidence } from "./evidence/route";
import { GET, PATCH } from "./route";

jest.mock("server-only", () => ({}));
jest.mock("@/domains/auth/services/resolve_current_user", () => ({
  resolveCurrentUser: jest.fn(),
}));
jest.mock("@/domains/legal/services/consent_service", () => ({
  readLegalPreferences: jest.fn(),
  saveLegalPreferences: jest.fn(),
}));
jest.mock("@/domains/legal/services/legal_evidence", () => ({
  readLegalEvidence: jest.fn(),
}));
jest.mock("@/lib/supabase/server", () => ({
  createRouteHandlerSupabaseClient: () => ({}),
  copySupabaseResponseCookies: (_source: object, target: object) => target,
}));
const user = {
  id: "owner",
  authUserId: "auth-owner",
  email: "owner@example.invalid",
  role: "customer",
  status: "active",
  emailVerified: true,
  profile: { firstName: "Ana", lastName: "Example" },
} as const;
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(resolveCurrentUser).mockResolvedValue(user);
});
it("requires authenticated ownership and marks evidence private/no-store", async () => {
  await GET(new NextRequest("http://localhost/api/account/legal?userId=other"));
  expect(readLegalPreferences).toHaveBeenCalledWith("owner");
  const response = await ownEvidence(
    new NextRequest("http://localhost/api/account/legal/evidence?userId=other"),
  );
  expect(readLegalEvidence).toHaveBeenCalledWith("owner");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Content-Disposition")).toContain("attachment");
  jest.mocked(resolveCurrentUser).mockResolvedValue(null);
  expect(
    (await GET(new NextRequest("http://localhost/api/account/legal"))).status,
  ).toBe(401);
});
it("rejects cross-origin changes and incomplete decisions before writing", async () => {
  expect(
    (
      await PATCH(
        new NextRequest("http://localhost/api/account/legal", {
          method: "PATCH",
          headers: {
            origin: "https://attacker.invalid",
            "content-type": "application/json",
          },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await PATCH(
        new NextRequest("http://localhost/api/account/legal", {
          method: "PATCH",
          headers: {
            origin: "http://localhost",
            "content-type": "application/json",
          },
          body: "{}",
        }),
      )
    ).status,
  ).toBe(400);
  expect(saveLegalPreferences).not.toHaveBeenCalled();
});
it("does not expose another customer's evidence to customers or support", async () => {
  const request = new NextRequest(
    "http://localhost/api/admin/legal/evidence?userId=other",
  );
  expect((await adminEvidence(request)).status).toBe(403);
  jest
    .mocked(resolveCurrentUser)
    .mockResolvedValue({ ...user, role: "support" });
  expect((await adminEvidence(request)).status).toBe(403);
  expect(readLegalEvidence).not.toHaveBeenCalled();
  jest.mocked(resolveCurrentUser).mockResolvedValue({ ...user, role: "admin" });
  expect((await adminEvidence(request)).status).toBe(200);
  expect(readLegalEvidence).toHaveBeenCalledWith("other");
});
