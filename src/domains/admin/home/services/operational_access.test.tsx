import AdminPage from "@/app/admin/(panel)/page";
import PriorityPage from "@/app/admin/(panel)/pendientes/page";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import { getPriorityBlock, getPriorityQueue } from "./operational_service";
jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireAdminUser: jest.fn(),
}));
jest.mock("./operational_service", () => ({
  getPriorityBlock: jest.fn(),
  getPriorityQueue: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  notFound: () => {
    throw Error("404");
  },
}));
beforeEach(() => jest.clearAllMocks());
it.each(["unauthorized", "forbidden"])(
  "does not start any operational reads before %s authentication",
  async (reason) => {
    jest.mocked(requireAdminUser).mockRejectedValue(Error(reason));
    await expect(AdminPage()).rejects.toThrow(reason);
    await expect(
      PriorityPage({ searchParams: Promise.resolve({ group: "unpaid" }) }),
    ).rejects.toThrow(reason);
    expect(getPriorityBlock).not.toHaveBeenCalled();
    expect(getPriorityQueue).not.toHaveBeenCalled();
  },
);
it("rejects unknown filters only after authorization", async () => {
  jest.mocked(requireAdminUser).mockResolvedValue({
    id: "admin",
    authUserId: "admin",
    email: "qa@example.invalid",
    role: "admin",
    status: "active",
    emailVerified: true,
    profile: { firstName: null, lastName: null },
  });
  await expect(
    PriorityPage({ searchParams: Promise.resolve({ group: "private-costs" }) }),
  ).rejects.toThrow("404");
  expect(requireAdminUser).toHaveBeenCalled();
  expect(getPriorityQueue).not.toHaveBeenCalled();
});
