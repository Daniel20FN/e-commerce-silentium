import AnalysisPage from "@/app/admin/(panel)/analisis/page";
import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import { getAnalysis } from "./analysis_service";
jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireAdminUser: jest.fn(),
}));
jest.mock("./analysis_service", () => ({ getAnalysis: jest.fn() }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  notFound: () => {
    throw Error("404");
  },
}));
beforeEach(() => jest.clearAllMocks());
it.each(["unauthorized", "forbidden"])(
  "auth precedes any reads for %s",
  async (reason) => {
    jest.mocked(requireAdminUser).mockRejectedValueOnce(Error(reason));
    await expect(
      AnalysisPage({ searchParams: Promise.resolve({ days: "365" }) }),
    ).rejects.toThrow(reason);
    expect(getAnalysis).not.toHaveBeenCalled();
  },
);
it("rejects invalid periods and repeated rank params after auth", async () => {
  jest.mocked(requireAdminUser).mockResolvedValue({
    id: "admin",
    authUserId: "admin",
    email: "qa@example.invalid",
    role: "admin",
    status: "active",
    emailVerified: true,
    profile: { firstName: null, lastName: null },
  });
  for (const query of [{ days: "365" }, { rank: ["products", "variants"] }])
    await expect(
      AnalysisPage({ searchParams: Promise.resolve(query) }),
    ).rejects.toThrow("404");
  expect(getAnalysis).not.toHaveBeenCalled();
});
