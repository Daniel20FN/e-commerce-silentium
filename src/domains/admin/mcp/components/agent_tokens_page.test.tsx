import { CancellableApiProvider } from "@/context/use_cancellable_api_context";
import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { McpTokenDto } from "../types/mcp_token";
import { AgentTokensPage } from "./agent_tokens_page";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("notistack", () => ({ enqueueSnackbar: jest.fn() }));

const copy = dictionary.admin.agents;
const SECRET = "slm_" + "A".repeat(43);
const activeToken: McpTokenDto = {
  id: "tok_1",
  name: "Codex portátil",
  prefix: "slm_abcdef",
  scopes: ["read", "write"],
  createdAt: "2026-11-10T12:00:00.000Z",
  lastUsedAt: null,
  expiresAt: "2026-12-10T12:00:00.000Z",
  revokedAt: null,
  state: "active",
};
const revokedToken: McpTokenDto = {
  ...activeToken,
  id: "tok_2",
  name: "Token viejo",
  scopes: ["read"],
  state: "revoked",
  revokedAt: "2026-11-11T12:00:00.000Z",
};

function renderPage() {
  return render(
    <CancellableApiProvider>
      <AgentTokensPage dictionary={dictionary} />
    </CancellableApiProvider>,
  );
}

async function openCreateDialog() {
  fireEvent.click(
    await screen.findByRole("button", { name: copy.createButton }),
  );
  return screen.findByRole("dialog");
}

describe("agent tokens admin page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(apiService.get).mockResolvedValue({
      tokens: [activeToken, revokedToken],
    });
  });

  it("lists tokens with prefix, permissions, usage, expiry and state from the dictionary", async () => {
    renderPage();
    const list = await screen.findByRole("list", { name: copy.listLabel });
    const [first, second] = within(list).getAllByRole("listitem");
    expect(within(first).getByText(activeToken.name)).toBeInTheDocument();
    expect(within(first).getByText("slm_abcdef…")).toBeInTheDocument();
    expect(within(first).getByText(copy.states.active)).toBeInTheDocument();
    expect(
      within(first).getByText(`${copy.scopes.read}, ${copy.scopes.write}`),
    ).toBeInTheDocument();
    expect(within(first).getByText(copy.never)).toBeInTheDocument();
    expect(within(second).getByText(copy.states.revoked)).toBeInTheDocument();
    // Only active tokens can be revoked.
    expect(
      within(first).getByRole("button", { name: /Revocar/ }),
    ).toBeVisible();
    expect(
      within(second).queryByRole("button", { name: /Revocar/ }),
    ).toBeNull();
    expect(apiService.get).toHaveBeenCalledWith(
      "/admin/agent-tokens",
      undefined,
      undefined,
      expect.any(AbortSignal),
    );
  });

  it("shows an empty state", async () => {
    jest.mocked(apiService.get).mockResolvedValue({ tokens: [] });
    renderPage();
    expect(await screen.findByText(copy.emptyTitle)).toBeInTheDocument();
  });

  it("offers a retry when the list cannot be loaded", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.mocked(apiService.get).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    expect(await screen.findByText(copy.errorTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(await screen.findByText(activeToken.name)).toBeInTheDocument();
  });

  it("creates a token after rechecking the password and shows the secret once", async () => {
    const created: McpTokenDto = {
      ...activeToken,
      id: "tok_3",
      name: "Claude Code",
      scopes: ["read", "write"],
    };
    jest
      .mocked(apiService.post)
      .mockResolvedValue({ token: created, secret: SECRET });
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderPage();
    const dialog = await openCreateDialog();

    fireEvent.change(
      within(dialog).getByLabelText(new RegExp(copy.create.name)),
      {
        target: { value: "Claude Code" },
      },
    );
    fireEvent.mouseDown(
      within(dialog).getByRole("combobox", {
        name: new RegExp(copy.create.access),
      }),
    );
    fireEvent.click(
      await screen.findByRole("option", { name: copy.create.accessReadWrite }),
    );
    fireEvent.change(
      within(dialog).getByLabelText(new RegExp(copy.create.password)),
      { target: { value: "contraseña-actual" } },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: copy.create.submit }),
    );

    await waitFor(() => expect(apiService.post).toHaveBeenCalledTimes(1));
    expect(apiService.post).toHaveBeenCalledWith(
      "/admin/agent-tokens",
      {
        name: "Claude Code",
        access: "read_write",
        expiresInDays: 30,
        currentPassword: "contraseña-actual",
      },
      undefined,
      expect.any(AbortSignal),
    );

    expect(await screen.findByText(copy.secret.warning)).toBeInTheDocument();
    const secretField = screen.getByLabelText(copy.secret.label);
    expect(secretField).toHaveValue(SECRET);
    expect(secretField).toHaveAttribute("readonly");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.secret.copy }));
    });
    expect(writeText).toHaveBeenCalledWith(SECRET);
    expect(await screen.findByText(copy.secret.copied)).toBeInTheDocument();

    // The secret can only be dismissed explicitly and then disappears for good.
    fireEvent.click(screen.getByRole("button", { name: copy.secret.done }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.textContent).not.toContain(SECRET);
    expect(screen.getByText("Claude Code")).toBeInTheDocument();

    const reopened = await openCreateDialog();
    expect(within(reopened).queryByLabelText(copy.secret.label)).toBeNull();
    expect(
      within(reopened).getByLabelText(new RegExp(copy.create.password)),
    ).toHaveValue("");
  });

  it("maps a wrong password to the dictionary and clears it", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest
      .mocked(apiService.post)
      .mockRejectedValue(new Error("account_password_invalid"));
    renderPage();
    const dialog = await openCreateDialog();
    fireEvent.change(
      within(dialog).getByLabelText(new RegExp(copy.create.name)),
      {
        target: { value: "Codex" },
      },
    );
    const password = within(dialog).getByLabelText(
      new RegExp(copy.create.password),
    );
    fireEvent.change(password, { target: { value: "mal" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: copy.create.submit }),
    );
    expect(
      await screen.findByText(copy.errors.account_password_invalid),
    ).toBeInTheDocument();
    expect(password).toHaveValue("");
  });

  it("requires a name and a password before submitting", async () => {
    renderPage();
    const dialog = await openCreateDialog();
    expect(
      within(dialog).getByRole("button", { name: copy.create.submit }),
    ).toBeDisabled();
  });

  it("revokes a token after confirmation", async () => {
    jest.mocked(apiService.delete).mockResolvedValue({
      token: {
        ...activeToken,
        state: "revoked",
        revokedAt: "2026-11-12T00:00:00.000Z",
      },
    });
    renderPage();
    const list = await screen.findByRole("list", { name: copy.listLabel });
    fireEvent.click(
      within(within(list).getAllByRole("listitem")[0]).getByRole("button", {
        name: /Revocar/,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(new RegExp(activeToken.name)),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole("button", { name: copy.revoke.confirm }),
    );
    await waitFor(() =>
      expect(apiService.delete).toHaveBeenCalledWith(
        "/admin/agent-tokens/tok_1",
        undefined,
        copy.revoke.success,
        expect.any(AbortSignal),
      ),
    );
    await waitFor(() =>
      expect(
        within(
          within(
            screen.getByRole("list", { name: copy.listLabel }),
          ).getAllByRole("listitem")[0],
        ).getByText(copy.states.revoked),
      ).toBeInTheDocument(),
    );
  });
});
