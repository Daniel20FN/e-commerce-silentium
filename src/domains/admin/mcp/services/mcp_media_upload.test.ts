/** @jest-environment node */

import { createHash } from "node:crypto";
import type { McpActor } from "./mcp_auth";
import { findMcpTool } from "./mcp_registry";
import { executeMcpTool } from "./mcp_tool_runner";
import {
  MCP_IMAGE_BASE64_MAX_DECODED_BYTES,
  MCP_IMAGE_BASE64_MAX_LENGTH,
} from "./tools/media_tools";

// The real catalog media service and its MIME/size/signature validation run
// here; only the infrastructure (database transaction and Storage) is faked.
const mockUpload = jest.fn();
const mockGetBucket = jest.fn();
const mockTx = {
  $queryRaw: jest.fn(),
  product: { findFirst: jest.fn() },
  productVariant: { findFirst: jest.fn() },
  catalogImage: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx),
  },
}));
jest.mock("@/lib/supabase/shared", () => ({
  getSupabaseCatalogStorageBucket: () => "catalog",
}));
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      getBucket: (...args: unknown[]) => mockGetBucket(...args),
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example/${path}` },
        }),
        upload: (...args: unknown[]) => mockUpload(...args),
      }),
    },
  }),
}));

const actor: McpActor = {
  id: "user_1",
  label: "Ana Gómez",
  role: "admin",
  tokenId: "tok_1",
  scopes: ["read", "write"],
  expiresAt: new Date("2026-12-10T00:00:00Z"),
};
const EMPTY_GALLERY_REVISION = createHash("sha256").update("[]").digest("hex");
const PNG_BYTES = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);

function uploadInput(overrides: Record<string, unknown> = {}) {
  return {
    productId: "p1",
    variantId: null,
    revision: EMPTY_GALLERY_REVISION,
    fileName: "foto.png",
    contentType: "image/png",
    dataBase64: PNG_BYTES.toString("base64"),
    ...overrides,
  };
}

async function upload(input: unknown) {
  const tool = findMcpTool("media_upload_image_base64");
  if (!tool) throw new Error("tool missing");
  const result = await executeMcpTool(tool, input, actor);
  const block = result.content[0];
  const text = block && "text" in block ? block.text : "{}";
  return { isError: result.isError === true, payload: JSON.parse(text) };
}

describe("media_upload_image_base64", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTx.product.findFirst.mockResolvedValue({ id: "p1" });
    mockTx.catalogImage.findMany.mockResolvedValue([]);
    mockTx.catalogImage.count.mockResolvedValue(0);
    mockTx.catalogImage.create.mockResolvedValue({ id: "img_1" });
    mockTx.catalogImage.update.mockResolvedValue({});
    mockTx.catalogImage.updateMany.mockResolvedValue({ count: 1 });
    mockGetBucket.mockResolvedValue({ data: { public: true }, error: null });
    mockUpload.mockResolvedValue({ error: null });
  });

  it("caps the payload below Vercel's 4.5 MB request limit", () => {
    expect(MCP_IMAGE_BASE64_MAX_DECODED_BYTES).toBeLessThan(3 * 1024 * 1024);
    expect(MCP_IMAGE_BASE64_MAX_LENGTH).toBeLessThan(4_000_000);
  });

  it("uploads a valid image through the existing media service", async () => {
    const { isError, payload } = await upload(uploadInput());
    expect(isError).toBe(false);
    expect(payload.data.uploadedImageId).toBe("img_1");
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const [path, file, options] = mockUpload.mock.calls[0] ?? [];
    expect(path).toEqual(expect.stringContaining("product"));
    expect(file).toBeInstanceOf(File);
    expect(options).toMatchObject({ contentType: "image/png", upsert: false });
  });

  it("rejects base64 payloads over the cap before decoding", async () => {
    const { isError, payload } = await upload(
      uploadInput({ dataBase64: "A".repeat(MCP_IMAGE_BASE64_MAX_LENGTH + 4) }),
    );
    expect(isError).toBe(true);
    expect(payload).toMatchObject({
      error: { type: "validation_error", code: "invalid_input" },
    });
    expect(mockTx.catalogImage.create).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects malformed base64", async () => {
    const { isError } = await upload(
      uploadInput({ dataBase64: "not base64!" }),
    );
    expect(isError).toBe(true);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects unsupported MIME types with the existing validation", async () => {
    const { isError, payload } = await upload(
      uploadInput({ contentType: "image/gif", fileName: "foto.gif" }),
    );
    expect(isError).toBe(true);
    expect(payload).toMatchObject({
      error: { type: "validation_error", code: "unsupported_image_type" },
    });
    expect(mockTx.catalogImage.create).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects content whose signature does not match the declared type", async () => {
    const { isError, payload } = await upload(
      uploadInput({
        dataBase64: Buffer.from("<script>alert(1)</script>").toString("base64"),
      }),
    );
    expect(isError).toBe(true);
    expect(payload).toMatchObject({
      error: { type: "validation_error", code: "unsupported_image_type" },
    });
    expect(mockUpload).not.toHaveBeenCalled();
    // The reservation is marked failed instead of staying pending.
    expect(mockTx.catalogImage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed" }),
      }),
    );
  });

  it("rejects a stale gallery revision as a conflict", async () => {
    const { isError, payload } = await upload(
      uploadInput({ revision: "f".repeat(64) }),
    );
    expect(isError).toBe(true);
    expect(payload).toMatchObject({ error: { type: "conflict" } });
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
