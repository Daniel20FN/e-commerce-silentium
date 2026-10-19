import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { CatalogCostsData } from "../types/api_params";
import { CatalogCostsDialog } from "./catalog_costs_dialog";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
}));
jest.mock("notistack", () => ({ enqueueSnackbar: jest.fn() }));
const copy = dictionary.admin.costs;
const revision = "2026-10-19T00:00:00.000Z";
const item = {
  id: "c",
  variantId: null,
  name: "Tela",
  description: "Algodón",
  amountCents: 5000000,
  deletedAt: null,
  revision,
};
const data: CatalogCostsData = {
  items: [item],
  variants: [
    {
      id: "v",
      sku: "SKU-1",
      label: "Doble",
      priceCents: 10000000,
      active: true,
      inTrash: false,
    },
  ],
  summaries: {
    v: {
      generalCents: 5000000,
      specificCents: 0,
      totalCents: 5000000,
      marginCents: 5000000,
      marginPercent: 50,
      hasCosts: true,
    },
  },
  writable: true,
};
const props = {
  dictionary,
  product: { id: "p", name: "Aurora" },
  onClose: jest.fn(),
};
async function ready() {
  render(<CatalogCostsDialog {...props} />);
  await screen.findByText("Tela —", { exact: false });
}
describe("catalog costs operational UI", () => {
  it("follows the cost scope in the margin summary", async () => {
    jest.mocked(apiService.get).mockResolvedValue({
      ...data,
      variants: [
        ...data.variants,
        { ...data.variants[0], id: "v2", sku: "SKU-2" },
      ],
      summaries: {
        ...data.summaries,
        v2: { ...data.summaries.v, marginCents: 4000000 },
      },
    });
    await ready();
    expect(
      screen.getByRole("combobox", { name: copy.scope }),
    ).toHaveTextContent(copy.general);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: copy.scope }));
    fireEvent.click(screen.getByRole("option", { name: /SKU-2/ }));
    expect(
      screen.getByRole("combobox", { name: copy.reviewVariant }),
    ).toHaveTextContent("SKU-2");
  });
  it("shows loss warnings and a non-calculable zero-price percentage", async () => {
    jest.mocked(apiService.get).mockResolvedValue({
      ...data,
      variants: [{ ...data.variants[0], priceCents: 0 }],
      summaries: {
        v: {
          ...data.summaries.v,
          marginCents: -5000000,
          marginPercent: null,
        },
      },
    });
    await ready();
    expect(screen.getByText(copy.negative)).toBeInTheDocument();
    expect(screen.getByText(copy.notApplicable)).toBeInTheDocument();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(apiService.get).mockResolvedValue(data);
    jest.mocked(apiService.post).mockResolvedValue(data);
    jest.mocked(apiService.put).mockResolvedValue(data);
    jest.mocked(apiService.patch).mockResolvedValue(data);
  });
  it("shows per-unit rule and saves pesos as integer cents", async () => {
    await ready();
    expect(screen.getByText(copy.rule)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.name, { exact: false }), {
      target: { value: "Confección" },
    });
    fireEvent.change(screen.getByLabelText(copy.amount, { exact: false }), {
      target: { value: "20000,50" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.save }));
    await waitFor(() =>
      expect(apiService.post).toHaveBeenCalledWith("/admin/products/p/costs", {
        variantId: null,
        name: "Confección",
        description: null,
        amountCents: 2000050,
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(copy.name, { exact: false })).toHaveValue(
        "",
      ),
    );
  });
  it("edits with revision; warns duplicates without blocking legitimate repeated concepts", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: copy.edit }));
    expect(screen.getByLabelText(copy.amount, { exact: false })).toHaveValue(
      "50000",
    );
    fireEvent.change(screen.getByLabelText(copy.amount, { exact: false }), {
      target: { value: "60000" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.update }));
    await waitFor(() =>
      expect(apiService.put).toHaveBeenCalledWith(
        "/admin/products/p/costs",
        expect.objectContaining({ id: "c", revision, amountCents: 6000000 }),
      ),
    );
  });
  it("requires confirmation for removal and sends recovery action", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: copy.trash }));
    const confirm = screen.getByRole("dialog", { name: copy.confirmTitle });
    expect(apiService.patch).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole("button", { name: copy.trash }));
    await waitFor(() =>
      expect(apiService.patch).toHaveBeenCalledWith("/admin/products/p/costs", {
        id: "c",
        revision,
        action: "trash",
      }),
    );
  });
  it("preserves form after conflict and requires explicit discard on close", async () => {
    jest.mocked(apiService.put).mockRejectedValue(new Error("cost_conflict"));
    await ready();
    fireEvent.click(screen.getByRole("button", { name: copy.edit }));
    fireEvent.change(screen.getByLabelText(copy.name, { exact: false }), {
      target: { value: "Tela nueva" },
    });
    fireEvent.click(screen.getByRole("button", { name: copy.update }));
    await screen.findByText(copy.errors.cost_conflict);
    expect(screen.getByLabelText(copy.name, { exact: false })).toHaveValue(
      "Tela nueva",
    );
    fireEvent.click(screen.getByRole("button", { name: copy.close }));
    expect(screen.getByText(copy.discardTitle)).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: copy.keepEditing }));
    expect(screen.getByLabelText(copy.name, { exact: false })).toHaveValue(
      "Tela nueva",
    );
  });
  it("restores retired costs and shows no-cost warning", async () => {
    jest.mocked(apiService.get).mockResolvedValue({
      ...data,
      items: [{ ...item, deletedAt: revision }],
      summaries: {
        v: { ...data.summaries.v, hasCosts: false, totalCents: 0 },
      },
    });
    render(<CatalogCostsDialog {...props} />);
    await screen.findByText(copy.noCosts);
    fireEvent.click(screen.getByLabelText(copy.showTrash));
    fireEvent.click(screen.getByRole("button", { name: copy.restore }));
    await waitFor(() =>
      expect(apiService.patch).toHaveBeenCalledWith("/admin/products/p/costs", {
        id: "c",
        revision,
        action: "restore",
      }),
    );
  });
  it("is read-only for archived parents", async () => {
    jest.mocked(apiService.get).mockResolvedValue({ ...data, writable: false });
    await ready();
    expect(screen.getByText(copy.readOnly)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
    expect(screen.getByRole("button", { name: copy.trash })).toBeDisabled();
  });
  it("validates decimal input and signals duplicates", async () => {
    await ready();
    fireEvent.change(screen.getByLabelText(copy.name, { exact: false }), {
      target: { value: " tela " },
    });
    expect(screen.getByText(copy.duplicate)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.amount, { exact: false }), {
      target: { value: "1e3" },
    });
    expect(screen.getByRole("button", { name: copy.save })).toBeDisabled();
  });
});
