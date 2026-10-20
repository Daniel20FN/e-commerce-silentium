import { getDictionary } from "@/dictionary/services/get-dictionary";
import { fireEvent, render, screen } from "@testing-library/react";
import type { InventoryData } from "../types/api_params";
import { InventoryHistory } from "./inventory_history";
const dictionary = getDictionary("es");
const data: InventoryData = {
  readOnly: false,
  variants: [
    {
      id: "v",
      sku: "QA-V",
      stock: 2,
      revision: 1,
      minimum: null,
      inTrash: false,
      active: true,
    },
  ],
  movements: [
    {
      id: "m",
      variantId: "v",
      sku: "QA-V",
      type: "entry",
      delta: 2,
      before: 0,
      after: 2,
      actorLabel: "QA",
      reason: "Test",
      reference: null,
      reversedById: null,
      createdAt: "2026-10-20T12:00:00.000Z",
    },
  ],
  nextCursor: null,
};
test("filters dates as local day bounds and prevents reversed intervals", () => {
  const onFilter = jest.fn();
  render(
    <InventoryHistory
      dictionary={dictionary}
      data={data}
      busy={false}
      disableReversal={false}
      onFilter={onFilter}
      onMore={jest.fn()}
      onReverse={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(dictionary.admin.inventory.from), {
    target: { value: "2026-10-20" },
  });
  fireEvent.change(screen.getByLabelText(dictionary.admin.inventory.to), {
    target: { value: "2026-10-19" },
  });
  expect(
    screen.getByRole("button", { name: dictionary.admin.inventory.filter }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText(dictionary.admin.inventory.to), {
    target: { value: "2026-10-20" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.admin.inventory.filter }),
  );
  expect(onFilter).toHaveBeenCalledWith({
    from: new Date("2026-10-20T00:00:00").toISOString(),
    to: new Date("2026-10-20T23:59:59.999").toISOString(),
  });
});
test("readonly history preserves movement detail but hides reversal", () => {
  render(
    <InventoryHistory
      dictionary={dictionary}
      data={{ ...data, readOnly: true }}
      busy={false}
      disableReversal={false}
      onFilter={jest.fn()}
      onMore={jest.fn()}
      onReverse={jest.fn()}
    />,
  );
  expect(screen.getByText("QA-V")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: dictionary.admin.inventory.reverse }),
  ).not.toBeInTheDocument();
});
