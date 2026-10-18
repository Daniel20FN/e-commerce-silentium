import type { ApiResponse } from "./api_response";
import { apiService } from "./api_service";
jest.mock("notistack", () => ({ enqueueSnackbar: jest.fn() }));
describe("ApiService request bodies", () => {
  const mockFetch = jest.fn();
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ json: async () => ({ data: { ok: true } }) });
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });
  it("lets the browser set multipart boundaries rather than serializing FormData", async () => {
    const form = new FormData();
    form.set("file", new File(["image"], "image.png"));
    await apiService.post<ApiResponse<{ ok: boolean }>, FormData>(
      "/test",
      form,
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/test", {
      method: "POST",
      body: form,
    });
  });
  it("preserves JSON requests for existing consumers", async () => {
    await apiService.put<ApiResponse<{ ok: boolean }>, { id: string }>(
      "/test",
      { id: "a" },
    );
    expect(mockFetch).toHaveBeenLastCalledWith("/api/test", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "a" }),
    });
  });
  it("restricts signed file PUTs to configured Storage and never sends app cookies", async () => {
    const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://storage.example";
    try {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await apiService.uploadSignedFile(
        "https://storage.example/storage/v1/object/upload/sign/bucket/one.png?token=test-only",
        new File(["png"], "one.png", { type: "image/png" }),
        "31536000",
      );
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining("/storage/v1/object/upload/sign/"),
        expect.objectContaining({
          method: "PUT",
          credentials: "omit",
          redirect: "error",
          body: expect.any(FormData),
        }),
      );
      const before = mockFetch.mock.calls.length;
      await expect(
        apiService.uploadSignedFile(
          "https://evil.example/upload",
          new File(["png"], "one.png"),
          "1",
        ),
      ).rejects.toThrow("media_upload_failed");
      expect(mockFetch.mock.calls.length).toBe(before);
    } finally {
      if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    }
  });
});
