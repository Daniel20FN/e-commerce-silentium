import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LegalSettings } from "./legal_settings";

const mockGet = jest.fn();
const mockPatch = jest.fn();
const api = { get: mockGet, patch: mockPatch };
jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: () => ({ cancellableApi: api }),
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({
    currentAccepted: false,
    acceptsMarketingEmails: true,
    acceptsWhatsAppMarketing: true,
  });
  mockPatch.mockResolvedValue({
    currentAccepted: false,
    acceptsMarketingEmails: false,
    acceptsWhatsAppMarketing: false,
  });
});
it("withdraws advertising without requiring terms or privacy again", async () => {
  render(<LegalSettings copy={dictionary.legal} />);
  await screen.findByText(dictionary.legal.settings.review);
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.legal.settings.withdraw }),
  );
  await screen.findByText(dictionary.legal.settings.saved);
  expect(mockPatch).toHaveBeenCalledWith(
    "legal-save",
    "/account/legal",
    expect.objectContaining({
      acceptTerms: false,
      acceptPrivacy: false,
      adult: false,
      acceptsMarketingEmails: false,
      acceptsWhatsAppMarketing: false,
    }),
  );
});
it("does not re-request required acceptances for an already accepted release", async () => {
  mockGet.mockResolvedValue({
    currentAccepted: true,
    acceptsMarketingEmails: false,
    acceptsWhatsAppMarketing: false,
  });
  render(<LegalSettings copy={dictionary.legal} />);
  await screen.findByText(dictionary.legal.settings.accepted);
  expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  fireEvent.click(screen.getByLabelText(dictionary.legal.controls.email));
  fireEvent.click(
    screen.getByRole("button", { name: dictionary.legal.settings.accept }),
  );
  await waitFor(() => expect(mockPatch).toHaveBeenCalled());
  expect(mockPatch.mock.calls[0][2]).toEqual(
    expect.objectContaining({
      acceptTerms: false,
      acceptPrivacy: false,
      acceptsMarketingEmails: true,
    }),
  );
});
