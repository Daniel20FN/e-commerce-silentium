import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { publicationReport } from "../__fixtures__/publication";
import { PublicationPanel } from "./publication_panel";
jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn() },
}));
const get = jest.mocked(apiService.get),
  copy = dictionary.admin.products.publication;
const change = jest.fn(),
  publish = jest.fn(),
  reload = jest.fn();
function show(revision = publicationReport.updatedAt) {
  return render(
    <PublicationPanel
      dictionary={dictionary}
      productId="qa"
      revision={revision}
      returnTo="/admin/productos?brand=QA"
      saving={false}
      onChangeSection={change}
      onPublish={publish}
      onReload={reload}
    />,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({ report: publicationReport });
});
it("distinguishes a saved draft from a public product, links remediation and confirms activation", async () => {
  show();
  await screen.findByText(copy.hidden);
  expect(screen.getByText(copy.notPurchasable)).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: copy.openStore }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: copy.openPreview })).toHaveAttribute(
    "href",
    expect.stringContaining("/admin/productos/qa/preview?returnTo="),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: copy.fix.replace(
        "{section}",
        dictionary.admin.products.workspace.information,
      ),
    }),
  );
  expect(change).toHaveBeenCalledWith("information");
  fireEvent.click(screen.getByRole("button", { name: copy.publish }));
  expect(publish).not.toHaveBeenCalled();
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: copy.confirm,
    }),
  );
  expect(publish).toHaveBeenCalledTimes(1);
});
it("prevents activation from a report newer than the loaded product", async () => {
  show("2020-01-01T00:00:00.000Z");
  await screen.findByText(copy.stale);
  expect(screen.getByRole("button", { name: copy.publish })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", {
      name: dictionary.admin.products.workspace.reload,
    }),
  );
  expect(reload).toHaveBeenCalledTimes(1);
});
it("shows real store link for a visible sold out product, not a purchase promise", async () => {
  get.mockResolvedValue({
    report: {
      ...publicationReport,
      status: "active",
      visible: true,
      publicUrl: "/productos/qa",
      purchasable: false,
    },
  });
  show();
  expect(
    await screen.findByRole("link", { name: copy.openStore }),
  ).toHaveAttribute("href", "/productos/qa");
  expect(screen.getByText(copy.notPurchasable)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: copy.publish }),
  ).not.toBeInTheDocument();
});
it("keeps archived records consultable but does not offer activation", async () => {
  get.mockResolvedValue({
    report: { ...publicationReport, status: "archived", readOnly: true },
  });
  show();
  await screen.findByText(copy.hidden);
  expect(
    screen.queryByRole("button", { name: copy.publish }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: copy.openPreview }),
  ).toBeInTheDocument();
});
it("handles load failures and can retry without stale report actions", async () => {
  get.mockRejectedValueOnce(new Error("network"));
  show();
  await screen.findByText(copy.loadError);
  fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
  await screen.findByText(copy.hidden);
});
