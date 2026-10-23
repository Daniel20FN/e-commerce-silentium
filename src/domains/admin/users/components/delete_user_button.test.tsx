import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AdminUserListItemDto } from "../types/api_responses";
import { DeleteUserButton } from "./delete_user_button";
const mockDelete = jest.fn();
jest.mock("notistack", () => ({ enqueueSnackbar: jest.fn() }));
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({ cancellableApi: { delete: mockDelete } }),
}));
const user: AdminUserListItemDto = {
  id: "target",
  authUserId: "auth-target",
  email: "ana@example.invalid",
  fullName: "Ana",
  firstName: "Ana",
  lastName: null,
  role: "customer",
  status: "active",
  phone: null,
  createdAt: "2026-10-23",
  lastAccessAt: null,
};
const copy = dictionary.admin.users.deletion;
beforeEach(() => jest.resetAllMocks());
it("requires typed confirmation and refreshes only after success", async () => {
  const onDeleted = jest.fn();
  mockDelete.mockResolvedValue({ deletedId: "target" });
  render(
    <DeleteUserButton
      user={user}
      dictionary={dictionary}
      onDeleted={onDeleted}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: copy.button }));
  expect(mockDelete).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: copy.confirm })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(copy.confirmLabel), {
    target: { value: user.email },
  });
  fireEvent.click(screen.getByRole("button", { name: copy.confirm }));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
});
it("shows actionable error without removing the row", async () => {
  const onDeleted = jest.fn();
  mockDelete.mockRejectedValue(new Error("user_delete_self"));
  render(
    <DeleteUserButton
      user={user}
      dictionary={dictionary}
      onDeleted={onDeleted}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: copy.button }));
  fireEvent.change(screen.getByLabelText(copy.confirmLabel), {
    target: { value: user.email },
  });
  fireEvent.click(screen.getByRole("button", { name: copy.confirm }));
  expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.self);
  expect(onDeleted).not.toHaveBeenCalled();
});
