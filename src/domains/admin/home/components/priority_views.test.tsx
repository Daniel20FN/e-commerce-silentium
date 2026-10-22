import dictionary from "@/dictionary/es.json";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import {
  getPriorityBlock,
  getPriorityQueue,
} from "../services/operational_service";
import type { PriorityQueue } from "../types/operational";
import { PriorityPanelContent } from "./priority_content";
import {
  PriorityLoading,
  PriorityPanel,
  PriorityQueueView,
} from "./priority_views";
jest.mock("../services/operational_service", () => ({
  getPriorityBlock: jest.fn(),
  getPriorityQueue: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
const c = dictionary.admin.dashboard.operations;
const queue: PriorityQueue = {
  group: "out",
  count: 0,
  rows: [],
  nextCursor: null,
  updatedAt: "2026-10-22T12:00:00Z",
  updatedLabel: "22/10/2026, 7:00 a. m.",
};
it("renders operational surfaces in the active client theme, including dark mode", () => {
  const theme = createTheme({
    palette: {
      mode: "dark",
      background: { paper: "#27211d" },
      text: { primary: "#ffffff" },
    },
  });
  const view = render(
    <ThemeProvider theme={theme}>
      <PriorityPanelContent block="inventory" queues={[queue]} copy={c} />
    </ThemeProvider>,
  );
  expect(view.container.querySelector("section")).toHaveStyle({
    backgroundColor: "rgb(39, 33, 29)",
    color: "rgb(255, 255, 255)",
  });
});
it("displays the exact server timestamp label without reformatting it in browser ICU", () => {
  const view = render(
    <PriorityPanelContent
      block="inventory"
      queues={[{ ...queue, updatedLabel: "21/10/2026, 9:00 a.\u00a0m." }]}
      copy={c}
    />,
  );
  expect(view.container.textContent).toContain("21/10/2026, 9:00 a.\u00a0m.");
});
it("shows explicit loading, no fake count", () => {
  render(<PriorityLoading title={c.blocks.inventory} copy={c} />);
  expect(screen.getByRole("status")).toHaveTextContent(c.loading);
  expect(screen.queryByText("0")).not.toBeInTheDocument();
});
it("renders genuine zero and distinguishes errors without retaining stale counters", async () => {
  jest.mocked(getPriorityBlock).mockResolvedValue([queue]);
  const view = render(await PriorityPanel({ block: "inventory", copy: c }));
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.getByText(c.empty)).toBeInTheDocument();
  view.unmount();
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  jest.mocked(getPriorityBlock).mockRejectedValue(Error("offline"));
  render(await PriorityPanel({ block: "inventory", copy: c }));
  expect(screen.getByRole("alert")).toHaveTextContent(c.error);
  expect(screen.queryByText("0")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: c.retry })).toBeEnabled();
  spy.mockRestore();
});
it("offers the real filtered queue and exact variant stock, including long SKUs", async () => {
  jest.mocked(getPriorityBlock).mockResolvedValue([
    {
      ...queue,
      count: 2,
      rows: [
        {
          id: "v",
          name: "Juego de sábanas",
          href: "/admin/productos/p?section=inventory",
          sku: "SKU-LARGO",
          stock: 0,
          minimum: 3,
          orderNumber: null,
        },
      ],
    },
  ]);
  render(await PriorityPanel({ block: "inventory", copy: c }));
  expect(screen.getByRole("link", { name: c.viewAll })).toHaveAttribute(
    "href",
    "/admin/pendientes?group=out",
  );
  expect(
    screen.getByRole("link", { name: "Juego de sábanas" }),
  ).toHaveAttribute("href", "/admin/productos/p?section=inventory");
  expect(screen.getByText(/Stock: 0/)).toHaveTextContent("Mínimo: 3");
});
it("keeps pagination in the same group", async () => {
  jest
    .mocked(getPriorityQueue)
    .mockResolvedValue({ ...queue, nextCursor: "next-v" });
  render(
    await PriorityQueueView({ group: "out", cursor: "previous-v", copy: c }),
  );
  expect(screen.getByRole("link", { name: c.next })).toHaveAttribute(
    "href",
    "/admin/pendientes?group=out&cursor=next-v",
  );
  expect(screen.getByRole("link", { name: c.firstPage })).toHaveAttribute(
    "href",
    "/admin/pendientes?group=out",
  );
});
