import { CancellableApiProvider } from "@/context/use_cancellable_api_context";
import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { navigateTo } from "../services/oauth_navigation";
import type { OAuthAuthorizeParams } from "../types/oauth_types";
import {
  OAuthConsentScreen,
  OAuthNoticeScreen,
  type OAuthConsentClientInfo,
} from "./oauth_consent_screen";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock("../services/oauth_navigation", () => ({ navigateTo: jest.fn() }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const copy = dictionary.mcpOAuth.consent;
const authorization: OAuthAuthorizeParams = {
  response_type: "code",
  client_id: "slcid_abc",
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  code_challenge: "c".repeat(43),
  code_challenge_method: "S256",
  state: "estado",
  scope: "read write",
  resource: "https://www.silentium-hogar.com/api/mcp",
};
const client: OAuthConsentClientInfo = {
  name: "Claude",
  uri: "https://claude.ai",
  redirectHost: "claude.ai",
  loopbackOnly: false,
  requestedScopes: ["read", "write"],
};

function renderScreen(override: Partial<OAuthConsentClientInfo> = {}) {
  return render(
    <CancellableApiProvider>
      <OAuthConsentScreen
        dictionary={dictionary}
        authorization={authorization}
        client={{ ...client, ...override }}
        accountLabel="Ana Gómez"
      />
    </CancellableApiProvider>,
  );
}

describe("OAuth consent screen (D6)", () => {
  beforeEach(() => jest.resetAllMocks());

  it("shows the client, its unverified marker, the redirect host and the account", () => {
    renderScreen();
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText(copy.unverified)).toBeInTheDocument();
    expect(screen.getByText(copy.unverifiedHelp)).toBeInTheDocument();
    expect(screen.getByText("claude.ai")).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/claude\.ai$/)).toBeInTheDocument();
    expect(screen.getByText("Ana Gómez")).toBeInTheDocument();
    expect(screen.queryByText(copy.localWarning)).toBeNull();
  });

  it("warns when the redirect only points to the local machine", () => {
    renderScreen({ redirectHost: "127.0.0.1:5000", loopbackOnly: true });
    expect(screen.getByText(copy.localWarning)).toBeInTheDocument();
  });

  it("defaults to read-only, whatever the client requested", () => {
    renderScreen();
    expect(
      screen.getByRole("radio", { name: new RegExp(copy.accessRead) }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: new RegExp(copy.accessReadWrite) }),
    ).not.toBeChecked();
    expect(screen.getByText(/lectura, escritura/)).toBeInTheDocument();
  });

  it("approves with the chosen access and navigates to the returned redirect", async () => {
    jest.mocked(apiService.post).mockResolvedValue({
      redirectTo: "https://claude.ai/cb?code=abc&state=estado",
    });
    renderScreen();
    fireEvent.click(
      screen.getByRole("radio", { name: new RegExp(copy.accessReadWrite) }),
    );
    fireEvent.click(screen.getByRole("button", { name: copy.approve }));
    await waitFor(() =>
      expect(navigateTo).toHaveBeenCalledWith(
        "https://claude.ai/cb?code=abc&state=estado",
      ),
    );
    expect(apiService.post).toHaveBeenCalledWith(
      "/oauth/authorize",
      { authorization, decision: "approve", access: "read_write" },
      undefined,
      expect.any(AbortSignal),
    );
  });

  it("denies without granting anything", async () => {
    jest.mocked(apiService.post).mockResolvedValue({
      redirectTo: "https://claude.ai/cb?error=access_denied",
    });
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: copy.deny }));
    await waitFor(() => expect(navigateTo).toHaveBeenCalledTimes(1));
    expect(apiService.post).toHaveBeenCalledWith(
      "/oauth/authorize",
      { authorization, decision: "deny", access: "read" },
      undefined,
      expect.any(AbortSignal),
    );
  });

  it("maps failures to dictionary messages and does not navigate", async () => {
    jest
      .mocked(apiService.post)
      .mockRejectedValue(new Error("oauth_grant_limit"));
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: copy.approve }));
    expect(
      await screen.findByText(copy.errors.oauth_grant_limit),
    ).toBeInTheDocument();
    expect(navigateTo).not.toHaveBeenCalled();
  });
});

describe("OAuth notice screen", () => {
  it("explains the denial to non-admin accounts", () => {
    render(
      <OAuthNoticeScreen
        dictionary={dictionary}
        title={dictionary.mcpOAuth.denied.title}
        subtitle={dictionary.mcpOAuth.denied.subtitle}
        body={dictionary.mcpOAuth.denied.body}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      dictionary.mcpOAuth.denied.body,
    );
  });
});
