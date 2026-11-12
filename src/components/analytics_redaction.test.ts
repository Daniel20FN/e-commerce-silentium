import { redactAnalyticsEvent } from "./analytics_redaction";

const ORIGIN = "https://www.silentium-hogar.com";

describe("redactAnalyticsEvent", () => {
  it.each([
    "/auth/confirm?token_hash=abc&type=invite",
    "/auth/invitacion?code=secret#access_token=x",
    "/oauth/authorize?client_id=c&state=s&code_challenge=p",
    "/admin/pedidos?q=cliente",
    "/account?tab=seguridad",
    "/login?next=/admin",
  ])("strips query and fragment on private route %s", (path) => {
    const result = redactAnalyticsEvent({
      type: "pageview",
      url: `${ORIGIN}${path}`,
    });
    const url = new URL(result.url);
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
    expect(url.pathname).toBe(new URL(`${ORIGIN}${path}`).pathname);
  });

  it("keeps public catalog filters intact", () => {
    const event = {
      type: "pageview" as const,
      url: `${ORIGIN}/productos?categoria=sala&page=2`,
    };
    expect(redactAnalyticsEvent(event)).toBe(event);
  });

  it("does not treat lookalike public paths as private", () => {
    const event = {
      type: "pageview" as const,
      url: `${ORIGIN}/administracion-de-hogar?x=1`,
    };
    expect(redactAnalyticsEvent(event)).toBe(event);
  });
});
