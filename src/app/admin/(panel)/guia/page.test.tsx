import { requireAdminUser } from "@/domains/admin/services/require_admin_user";
import { render, screen } from "@testing-library/react";
import AdminGuidePage, { dynamic, metadata } from "./page";

jest.mock("@/domains/admin/services/require_admin_user", () => ({
  requireAdminUser: jest.fn(),
}));

it("requires administrative access before rendering the selected guide", async () => {
  render(
    await AdminGuidePage({
      searchParams: Promise.resolve({ tema: "inventario" }),
    }),
  );
  expect(requireAdminUser).toHaveBeenCalledWith("/admin/guia");
  expect(screen.getByRole("article")).toHaveTextContent(
    "Registrar existencias",
  );
  expect(dynamic).toBe("force-dynamic");
  expect(metadata.robots).toEqual({ index: false, follow: false });
});
it("does not render content if the access guard rejects the request", async () => {
  jest
    .mocked(requireAdminUser)
    .mockRejectedValueOnce(new Error("unauthorized"));
  await expect(
    AdminGuidePage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("unauthorized");
});
