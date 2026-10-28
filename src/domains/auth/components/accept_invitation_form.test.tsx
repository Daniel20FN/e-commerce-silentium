import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { AcceptInvitationForm } from "./accept_invitation_form";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockSetSession = jest.fn();
const mockApi = { get: mockGet, post: mockPost };
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({
    cancellableApi: mockApi,
    isPending: () => false,
  }),
}));
jest.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({ auth: { setSession: mockSetSession } }),
}));
beforeEach(() => {
  jest.resetAllMocks();
  window.history.replaceState(null, "", "/auth/invitacion");
  mockSetSession.mockResolvedValue({ error: null });
});
it("displays a recoverable unavailable state rather than a password form for invalid sessions", async () => {
  mockGet.mockRejectedValue(new Error("invitation_unavailable"));
  render(<AcceptInvitationForm dictionary={dictionary} />);
  await screen.findByText(
    dictionary.auth.invitation.errors.invitation_unavailable,
  );
  expect(
    screen.queryByLabelText(dictionary.auth.common.password),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: dictionary.auth.invitation.login }),
  ).toHaveAttribute("href", "/login");
});
it("establishes the implicit invite session once in StrictMode and removes bearer tokens from the URL", async () => {
  window.history.replaceState(
    null,
    "",
    "/auth/invitacion#access_token=test-access&refresh_token=test-refresh&type=invite",
  );
  mockGet.mockResolvedValue({
    email: "invited@example.invalid",
    firstName: "Ana",
  });
  render(
    <StrictMode>
      <AcceptInvitationForm dictionary={dictionary} />
    </StrictMode>,
  );
  await screen.findByLabelText(
    new RegExp("^" + dictionary.auth.common.password),
  );
  expect(mockSetSession).toHaveBeenCalledTimes(1);
  expect(window.location.hash).toBe("");
  expect(document.body.textContent).not.toContain("test-access");
});
it("does not post mismatched passwords and reports errors without displaying passwords", async () => {
  mockGet.mockResolvedValue({
    email: "invited@example.invalid",
    firstName: "Ana",
  });
  render(<AcceptInvitationForm dictionary={dictionary} />);
  const password = await screen.findByLabelText(
    new RegExp("^" + dictionary.auth.common.password),
  );
  fireEvent.change(password, { target: { value: "long-password" } });
  fireEvent.change(
    screen.getByLabelText(
      new RegExp("^" + dictionary.auth.invitation.confirmPassword),
    ),
    { target: { value: "different-password" } },
  );
  screen
    .getAllByRole("checkbox")
    .forEach((checkbox) => fireEvent.click(checkbox));
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.auth.invitation.submit }),
  );
  await screen.findByText(dictionary.auth.invitation.passwordMismatch);
  expect(mockPost).not.toHaveBeenCalled();
  mockPost.mockRejectedValue(new Error("invitation_password_failed"));
  fireEvent.change(
    screen.getByLabelText(
      new RegExp("^" + dictionary.auth.invitation.confirmPassword),
    ),
    { target: { value: "long-password" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.auth.invitation.submit }),
  );
  await waitFor(() =>
    expect(
      screen.getByText(
        dictionary.auth.invitation.errors.invitation_password_failed,
      ),
    ).toBeInTheDocument(),
  );
  expect(mockPost).toHaveBeenCalledWith(
    "accept-user-invitation",
    "/auth/invitations",
    {
      password: "long-password",
      acceptTerms: true,
      acceptPrivacy: true,
      adult: true,
      legalVersion: "2026-10-28.1",
    },
  );
  expect(document.body.textContent).not.toContain("long-password");
});
