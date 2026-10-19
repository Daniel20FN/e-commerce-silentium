import { resolveCartSchema } from "@/domains/cart/services/cart_rules";
import { resolveCart } from "@/domains/cart/services/cart_service";
import type { ResolveCartResponse } from "@/domains/cart/types/api_params";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ResolveCartResponse>> {
  try {
    // Bound streamed bodies as well as Content-Length (which is optional/untrusted).
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { type: "validation_error" },
        { status: 400, headers },
      );
    const decoder = new TextDecoder();
    let bytes = 0;
    let text = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16384) {
        await reader.cancel();
        return NextResponse.json(
          { type: "validation_error" },
          { status: 413, headers },
        );
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { type: "validation_error" },
        { status: 400, headers },
      );
    }
    const parsed = resolveCartSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { type: "validation_error" },
        { status: 400, headers },
      );
    return NextResponse.json(
      { data: await resolveCart(parsed.data) },
      { headers },
    );
  } catch (error) {
    console.error("cart_resolve_failed", error);
    return NextResponse.json(
      { type: "internal_server_error" },
      { status: 500, headers },
    );
  }
}
