/** @jest-environment node */
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import AdminAgentsRoutePage from "./page";

jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireAdminUser: jest.fn(),
}));
jest.mock("@/domains/admin/mcp/components/agent_tokens_page", () => ({
  AgentTokensPage: () => null,
}));

beforeEach(() => jest.clearAllMocks());

it("guards the token page behind admin access", async () => {
  jest.mocked(requireAdminUser).mockRejectedValue(new Error("forbidden"));
  await expect(AdminAgentsRoutePage()).rejects.toThrow("forbidden");
  expect(requireAdminUser).toHaveBeenCalledWith("/admin/agentes");
});

it("renders for authorized administrators", async () => {
  jest.mocked(requireAdminUser).mockResolvedValue({
    id: "u",
    authUserId: "a",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    emailVerified: true,
    profile: { firstName: null, lastName: null },
  });
  await expect(AdminAgentsRoutePage()).resolves.toBeTruthy();
});
