/** @jest-environment node */
import { resolveCart } from "@/domains/cart/services/cart_service";
import { NextRequest } from "next/server";
import { POST } from "./route";
jest.mock("@/domains/cart/services/cart_service", () => ({
  resolveCart: jest.fn(),
}));
function request(body: string): NextRequest {
  return new NextRequest("http://localhost/api/cart/resolve", {
    method: "POST",
    body,
  });
}
describe("public bounded cart API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(resolveCart)
      .mockResolvedValue({ lines: [], valid: false, subtotalCents: 0 });
  });
  it("allows anonymous resolution, no-store and only domain DTO", async () => {
    const response = await POST(
      request(JSON.stringify({ items: [{ variantId: "v", quantity: 1 }] })),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      data: { lines: [], valid: false, subtotalCents: 0 },
    });
    expect(resolveCart).toHaveBeenCalledWith({
      items: [{ variantId: "v", quantity: 1 }],
    });
  });
  it.each([
    "no-json",
    "null",
    '{"items":[{"variantId":"v","quantity":0}]}',
    '{"items":[{"variantId":"v","quantity":1,"priceCents":1}]}',
    '{"items":[],"customerId":"admin"}',
    '{"items":[{"variantId":"v","quantity":1},{"variantId":"v","quantity":1}]}',
  ])("rejects malformed/overposted body %s", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(resolveCart).not.toHaveBeenCalled();
  });
  it("bounds stream even without Content-Length", async () => {
    const response = await POST(request(" ".repeat(17000)));
    expect(response.status).toBe(413);
    expect(resolveCart).not.toHaveBeenCalled();
  });
  it("hides unexpected error details", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    jest
      .mocked(resolveCart)
      .mockRejectedValue(new Error("private database detail"));
    const response = await POST(request('{"items":[]}'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("database");
    log.mockRestore();
  });
});
