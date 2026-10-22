import dictionary from "@/dictionary/es.json";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { analysisWindow } from "../services/analysis_rules";
import { AnalysisHome, AnalysisPanel } from "./analysis_content";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock(
  "next/dynamic",
  () => () =>
    function MockChart() {
      return <div data-testid="chart" />;
    },
);
const c = dictionary.admin.analysis,
  w = analysisWindow(7, new Date("2026-10-22T12:00:00Z"));
it("keeps periods in shareable links and marks current snapshots outside period", () => {
  render(
    <AnalysisHome c={c} w={w} variants>
      {null}
    </AnalysisHome>,
  );
  expect(screen.getByRole("link", { name: c.days[90] })).toHaveAttribute(
    "href",
    "/admin/analisis?days=90&rank=variants",
  );
  expect(screen.getByText(c.periodScope)).toBeVisible();
  expect(screen.getByText(c.moneyScope)).toBeVisible();
});
it("distinguishes loading, error and honest zero without drawing fake chart", () => {
  const v = render(<AnalysisPanel c={c} w={w} kind="activity" />);
  expect(screen.getByRole("status")).toHaveAccessibleName(c.loading);
  v.rerender(
    <AnalysisPanel c={c} w={w} kind="activity" result={{ ok: false }} />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(c.error);
  v.rerender(
    <AnalysisPanel
      c={c}
      w={w}
      kind="activity"
      result={{ ok: true, data: { points: [], total: 0, cents: 0 } }}
    />,
  );
  expect(screen.getByText(c.empty)).toBeVisible();
  expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
});
it("switches count/amount with exact accessible table data", () => {
  render(
    <AnalysisPanel
      c={c}
      w={w}
      kind="activity"
      result={{
        ok: true,
        data: {
          points: [
            {
              id: "2026-10-22",
              label: "22/10",
              count: 2,
              cents: 12345,
              href: null,
            },
          ],
          total: 2,
          cents: 12345,
        },
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: c.amount }));
  expect(screen.getByRole("button", { name: c.amount })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByText(c.data));
  expect(screen.getByRole("table")).toHaveAccessibleName(
    `${c.activity}: ${c.data}`,
  );
  expect(screen.getByRole("cell", { name: /123,45/ })).toBeVisible();
});
it("renders theme-aware current inventory and links only matching queues", () => {
  const view = render(
    <ThemeProvider
      theme={createTheme({
        palette: { mode: "dark", background: { paper: "#27211d" } },
      })}
    >
      <AnalysisPanel
        c={c}
        w={w}
        kind="inventory"
        result={{
          ok: true,
          data: {
            points: [
              {
                id: "out",
                label: c.out,
                count: 3,
                cents: 0,
                href: "/admin/pendientes?group=out",
              },
            ],
            total: 3,
            cents: 0,
          },
        }}
      />
    </ThemeProvider>,
  );
  expect(view.container.querySelector("section")).toHaveStyle({
    backgroundColor: "rgb(39, 33, 29)",
  });
  expect(screen.getByText(c.current)).toBeVisible();
  fireEvent.click(screen.getByText(c.data));
  expect(screen.getByRole("rowheader", { name: c.out })).toHaveStyle({
    minWidth: "120px",
    wordBreak: "normal",
    overflowWrap: "break-word",
  });
  expect(
    screen.getByRole("region", { name: `${c.inventory}: ${c.data}` }),
  ).toHaveAttribute("tabindex", "0");
  expect(screen.getByRole("link", { name: c.out })).toHaveAttribute(
    "href",
    "/admin/pendientes?group=out",
  );
});
