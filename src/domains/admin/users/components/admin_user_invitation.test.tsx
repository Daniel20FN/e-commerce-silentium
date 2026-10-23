import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminUserInvitation } from "./admin_user_invitation";

const mockPost = jest.fn();
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: { post: mockPost },
    isPending: () => false,
  }),
}));
beforeEach(() => {
  jest.resetAllMocks();
});
function fill(): void {
  fireEvent.click(
    screen.getByRole("button", {
      name: dictionary.admin.users.invitation.button,
    }),
  );
  fireEvent.change(screen.getByLabelText(/Nombre/), {
    target: { value: "Ana" },
  });
  fireEvent.change(screen.getByLabelText(/Apellido/), {
    target: { value: "Ejemplo" },
  });
  fireEvent.change(screen.getByLabelText(/Correo/), {
    target: { value: "ana@example.invalid" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: dictionary.admin.users.invitation.submit,
    }),
  );
}
it("shows SMTP restrictions without success or requesting a password", async () => {
  mockPost.mockRejectedValue(new Error("invitation_email_restricted"));
  render(<AdminUserInvitation dictionary={dictionary} />);
  fill();
  await waitFor(() =>
    expect(
      screen.getByText(
        dictionary.auth.invitation.errors.invitation_email_restricted,
      ),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByText(/Supabase ha aceptado/)).not.toBeInTheDocument();
  expect(document.querySelector('input[type="password"]')).toBeNull();
});
it("sends a typed admin invitation and acknowledges acceptance by the mail provider only", async () => {
  mockPost.mockResolvedValue({ email: "ana@example.invalid" });
  render(<AdminUserInvitation dictionary={dictionary} />);
  fill();
  await waitFor(() =>
    expect(
      screen.getByText(
        dictionary.admin.users.invitation.sent.replace(
          "{email}",
          "ana@example.invalid",
        ),
      ),
    ).toBeInTheDocument(),
  );
  expect(mockPost).toHaveBeenCalledWith(
    "admin-user-invite",
    "/admin/users/invitations",
    {
      firstName: "Ana",
      lastName: "Ejemplo",
      email: "ana@example.invalid",
      role: "admin",
    },
  );
  expect(
    screen.queryByRole("button", {
      name: dictionary.admin.users.invitation.submit,
    }),
  ).not.toBeInTheDocument();
});
