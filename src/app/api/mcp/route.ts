import { handleMcpRequest } from "@/domains/admin/mcp/services/mcp_http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export function GET(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export function OPTIONS(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}
