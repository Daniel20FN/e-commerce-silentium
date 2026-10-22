import { render, screen } from "@testing-library/react";
import Charts from "./analysis_charts";
jest.mock("@mui/material/useMediaQuery", () => ({
  __esModule: true,
  default: () => true,
}));
jest.mock("@mui/x-charts/LineChart", () => ({
  LineChart: ({ xAxis }: { xAxis: { height?: number }[] }) => (
    <div data-testid="line-axis" data-height={xAxis[0].height} />
  ),
}));
jest.mock("@mui/x-charts/BarChart", () => ({
  BarChart: ({
    xAxis,
    yAxis,
    margin,
  }: {
    xAxis: { height?: number }[];
    yAxis: { width: number }[];
    margin: { left: number };
  }) => (
    <div
      data-testid="bar-axis"
      data-height={xAxis[0].height}
      data-width={yAxis[0].width}
      data-left={margin.left}
    />
  ),
}));
it("reserves enough horizontal axis height for measured Manrope labels on both chart types", () => {
  const props = {
    points: [{ id: "one", label: "22/10", count: 1, cents: 100, href: null }],
    amount: false,
    label: "QA",
    title: "QA",
  };
  const v = render(<Charts {...props} line />);
  expect(screen.getByTestId("line-axis")).toHaveAttribute("data-height", "36");
  v.rerender(<Charts {...props} line={false} />);
  expect(screen.getByTestId("bar-axis")).toHaveAttribute("data-height", "36");
});

it("reserves plotting width at compact sizes rather than spending it on fixed labels/margins", () => {
  render(
    <Charts
      points={[
        { id: "out", label: "Agotadas", count: 9, cents: 0, href: null },
      ]}
      line={false}
      amount={false}
      label="QA"
      title="QA"
    />,
  );
  expect(screen.getByTestId("bar-axis")).toHaveAttribute("data-width", "92");
  expect(screen.getByTestId("bar-axis")).toHaveAttribute("data-left", "0");
});
