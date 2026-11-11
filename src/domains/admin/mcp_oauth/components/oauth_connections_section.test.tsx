import { CancellableApiProvider } from "@/context/use_cancellable_api_context";
import dictionary from "@/dictionary/es.json";
import { apiService } from "@/types/api-service/api_service";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { McpOAuthGrantDto } from "../types/oauth_types";
import { OAuthConnectionsSection } from "./oauth_connections_section";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock("notistack", () => ({ enqueueSnackbar: jest.fn() }));

const copy = dictionary.admin.agents;
const text = copy.connections;
const active: McpOAuthGrantDto = {
  id: "grant_1",
  clientName: "Codex web",
  clientUri: "https://codex.example",
  clientSource: "metadata_document",
  redirectHost: "codex.example",
  scopes: ["read", "write"],
  createdAt: "2026-11-10T12:00:00.000Z",
  lastUsedAt: "2026-11-11T08:00:00.000Z",
  expiresAt: "2027-02-08T12:00:00.000Z",
  revokedAt: null,
  state: "active",
};
const revoked: McpOAuthGrantDto = {
  ...active,
  id: "grant_2",
  clientName: "Inspector",
  scopes: ["read"],
  lastUsedAt: null,
  revokedAt: "2026-11-11T09:00:00.000Z",
  state: "revoked",
};

function renderSection() {
  return render(
    <CancellableApiProvider>
      <OAuthConnectionsSection copy={copy} />
    </CancellableApiProvider>,
  );
}

describe("OAuth connections section (D7)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(apiService.get)
      .mockResolvedValue({ grants: [active, revoked] });
  });

  it("lists connections with client, permissions, usage, expiry and state", async () => {
    renderSection();
    const list = await screen.findByRole("list", { name: text.listLabel });
    const [first, second] = within(list).getAllByRole("listitem");
    expect(within(first).getByText("Codex web")).toBeInTheDocument();
    expect(within(first).getByText(copy.states.active)).toBeInTheDocument();
    expect(
      within(first).getByText(`${copy.scopes.read}, ${copy.scopes.write}`),
    ).toBeInTheDocument();
    expect(within(second).getByText(copy.never)).toBeInTheDocument();
    expect(within(second).getByText(copy.states.revoked)).toBeInTheDocument();
    expect(apiService.get).toHaveBeenCalledWith(
      "/admin/agent-connections",
      undefined,
      undefined,
      expect.any(AbortSignal),
    );
    // Revoke only when active, delete only once revoked.
    expect(
      within(first).getByRole("button", { name: /Revocar/ }),
    ).toBeVisible();
    expect(
      within(first).queryByRole("button", { name: /Eliminar/ }),
    ).toBeNull();
    expect(
      within(second).queryByRole("button", { name: /Revocar/ }),
    ).toBeNull();
    expect(
      within(second).getByRole("button", { name: /Eliminar/ }),
    ).toBeVisible();
  });

  it("shows an empty state", async () => {
    jest.mocked(apiService.get).mockResolvedValue({ grants: [] });
    renderSection();
    expect(await screen.findByText(text.emptyTitle)).toBeInTheDocument();
  });

  it("offers a retry when the list cannot be loaded", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.mocked(apiService.get).mockRejectedValueOnce(new Error("boom"));
    renderSection();
    expect(await screen.findByText(text.errorTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.retry }));
    expect(await screen.findByText("Codex web")).toBeInTheDocument();
  });

  it("revokes after confirmation and marks the row revoked", async () => {
    jest.mocked(apiService.delete).mockResolvedValue({
      grant: {
        ...active,
        state: "revoked",
        revokedAt: "2026-11-12T00:00:00.000Z",
      },
    });
    renderSection();
    const list = await screen.findByRole("list", { name: text.listLabel });
    fireEvent.click(
      within(within(list).getAllByRole("listitem")[0]).getByRole("button", {
        name: /Revocar/,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Codex web/)).toBeInTheDocument();
    expect(apiService.delete).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: text.revoke.confirm }),
    );
    await waitFor(() =>
      expect(apiService.delete).toHaveBeenCalledWith(
        "/admin/agent-connections/grant_1",
        undefined,
        text.revoke.success,
        expect.any(AbortSignal),
      ),
    );
    await waitFor(() =>
      expect(
        within(within(list).getAllByRole("listitem")[0]).getByText(
          copy.states.revoked,
        ),
      ).toBeInTheDocument(),
    );
  });

  it("deletes a revoked connection after confirmation and removes the row", async () => {
    jest.mocked(apiService.delete).mockResolvedValue({ id: "grant_2" });
    renderSection();
    const list = await screen.findByRole("list", { name: text.listLabel });
    fireEvent.click(
      within(within(list).getAllByRole("listitem")[1]).getByRole("button", {
        name: /Eliminar/,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: text.delete.confirm }),
    );
    await waitFor(() =>
      expect(apiService.delete).toHaveBeenCalledWith(
        "/admin/agent-connections/grant_2/permanent",
        undefined,
        text.delete.success,
        expect.any(AbortSignal),
      ),
    );
    await waitFor(() =>
      expect(within(list).getAllByRole("listitem")).toHaveLength(1),
    );
  });

  it("keeps the row and explains the error when revocation fails", async () => {
    jest
      .mocked(apiService.delete)
      .mockRejectedValue(new Error("mcp_oauth_grant_not_found"));
    renderSection();
    const list = await screen.findByRole("list", { name: text.listLabel });
    fireEvent.click(
      within(within(list).getAllByRole("listitem")[0]).getByRole("button", {
        name: /Revocar/,
      }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: text.revoke.confirm }),
    );
    expect(
      await within(dialog).findByText(copy.errors.mcp_oauth_grant_not_found),
    ).toBeInTheDocument();
    expect(
      within(list).getAllByRole("listitem", { hidden: true }),
    ).toHaveLength(2);
  });
});
