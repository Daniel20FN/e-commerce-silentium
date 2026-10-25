import Loading from "@/app/(catalog)/account/loading";
import dictionary from "@/dictionary/es.json";
import { render, screen } from "@testing-library/react";

it("provides an accessible private-account fallback without fake products or interactive placeholders", () => {
  render(<Loading />);
  expect(screen.getByRole("status")).toHaveTextContent(
    dictionary.general.loading,
  );
  expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
