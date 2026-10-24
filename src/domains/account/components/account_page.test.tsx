import dictionary from "@/dictionary/es.json";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { AccountData } from "../types/api_responses";
import { AccountPage } from "./account_page";
const mockPatch = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockSetUser = jest.fn();
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: { patch: mockPatch, post: mockPost, delete: mockDelete },
  }),
}));
jest.mock("jotai", () => ({ atom: jest.fn(), useSetAtom: () => mockSetUser }));
const copy = dictionary.account;
const initial: AccountData = {
  user: {
    id: "own",
    authUserId: "auth-own",
    email: "ana@example.invalid",
    role: "customer",
    status: "active",
    emailVerified: true,
    profile: { firstName: "Ana", lastName: "Moreno" },
  },
  phone: "",
};
const setup = () => render(<AccountPage initial={initial} copy={copy} />);
beforeEach(() => jest.resetAllMocks());
it("shows own profile and read-only email without role controls", () => {
  setup();
  expect(screen.getByLabelText(copy.email, { exact: false })).toHaveAttribute(
    "readonly",
  );
  expect(screen.getByLabelText(copy.firstName, { exact: false })).toHaveValue(
    "Ana",
  );
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});
it("saves typed profile data and updates session display", async () => {
  mockPatch.mockResolvedValue(initial);
  setup();
  fireEvent.change(screen.getByLabelText(copy.firstName, { exact: false }), {
    target: { value: "Diana" },
  });
  fireEvent.click(screen.getByRole("button", { name: copy.save }));
  await screen.findByText(copy.saved);
  expect(mockPatch).toHaveBeenCalledWith("account-profile", "/account", {
    firstName: "Diana",
    lastName: "Moreno",
    phone: "",
  });
  expect(mockSetUser).toHaveBeenCalledWith(initial.user);
});
it("does not send mismatching new passwords", async () => {
  setup();
  fireEvent.change(
    screen.getByLabelText(copy.currentPassword, { exact: false }),
    {
      target: { value: "old-secret" },
    },
  );
  fireEvent.change(screen.getByLabelText(new RegExp(`^${copy.newPassword}`)), {
    target: { value: "new-secret" },
  });
  fireEvent.change(
    screen.getByLabelText(copy.repeatPassword, { exact: false }),
    {
      target: { value: "not-matching" },
    },
  );
  fireEvent.click(screen.getByRole("button", { name: copy.changePassword }));
  expect(
    await screen.findByText(copy.errors.account_password_mismatch),
  ).toBeInTheDocument();
  expect(mockPost).not.toHaveBeenCalled();
});
it("requires both own email and password and can cancel without deleting", () => {
  setup();
  fireEvent.click(screen.getByRole("button", { name: copy.deleteButton }));
  const dialog = within(screen.getByRole("dialog"));
  expect(
    dialog.getByRole("button", { name: copy.confirmDelete }),
  ).toBeDisabled();
  fireEvent.change(dialog.getByLabelText(copy.confirmEmail, { exact: false }), {
    target: { value: initial.user.email },
  });
  expect(
    dialog.getByRole("button", { name: copy.confirmDelete }),
  ).toBeDisabled();
  fireEvent.change(
    dialog.getByLabelText(copy.currentPassword, { exact: false }),
    {
      target: { value: "current-secret" },
    },
  );
  expect(
    dialog.getByRole("button", { name: copy.confirmDelete }),
  ).toBeEnabled();
  fireEvent.click(dialog.getByRole("button", { name: copy.cancel }));
  expect(mockDelete).not.toHaveBeenCalled();
});
it("keeps the account and dialog on deletion failure with actionable copy", async () => {
  mockDelete.mockRejectedValue(new Error("account_last_superadmin"));
  setup();
  fireEvent.click(screen.getByRole("button", { name: copy.deleteButton }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText(copy.confirmEmail, { exact: false }), {
    target: { value: initial.user.email },
  });
  fireEvent.change(
    dialog.getByLabelText(copy.currentPassword, { exact: false }),
    {
      target: { value: "current-secret" },
    },
  );
  fireEvent.click(dialog.getByRole("button", { name: copy.confirmDelete }));
  expect(
    await screen.findByText(copy.errors.account_last_superadmin),
  ).toBeInTheDocument();
  expect(mockSetUser).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(
      dialog.getByLabelText(copy.currentPassword, { exact: false }),
    ).toHaveValue(""),
  );
});
it("clears local user state only after confirmed deletion", async () => {
  mockDelete.mockResolvedValue({ success: true });
  setup();
  fireEvent.click(screen.getByRole("button", { name: copy.deleteButton }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText(copy.confirmEmail, { exact: false }), {
    target: { value: initial.user.email },
  });
  fireEvent.change(
    dialog.getByLabelText(copy.currentPassword, { exact: false }),
    {
      target: { value: "current-secret" },
    },
  );
  fireEvent.click(dialog.getByRole("button", { name: copy.confirmDelete }));
  expect(await screen.findByText(copy.deleted)).toBeInTheDocument();
  expect(mockSetUser).toHaveBeenCalledWith(null);
  expect(mockDelete).toHaveBeenCalledTimes(1);
});
