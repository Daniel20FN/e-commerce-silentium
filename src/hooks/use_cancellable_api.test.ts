import { apiService } from "@/types/api-service/api_service";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCancellableApi } from "./use_cancellable_api";

jest.mock("@/types/api-service/api_service", () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiService = jest.mocked(apiService);

describe("useCancellableApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears pending state after a failed post request", async () => {
    mockApiService.post.mockRejectedValueOnce(new Error("invalid_credentials"));

    const { result } = renderHook(() => useCancellableApi());

    await expect(
      act(async () => {
        await result.current.cancellableApi.post("auth-login", "/auth/login", {
          email: "admin@example.com",
          password: "wrong",
        });
      }),
    ).rejects.toThrow("invalid_credentials");

    expect(result.current.isPending("auth-login")).toBe(false);
  });

  it("keeps the latest request pending when an older request with the same id is aborted", async () => {
    mockApiService.post
      .mockImplementationOnce(
        (_endpoint, _params, _successMessage, signal?: AbortSignal) =>
          new Promise((_, reject) => {
            signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 20)),
      );

    const { result } = renderHook(() => useCancellableApi());

    const firstRequest = result.current.cancellableApi.post(
      "auth-login",
      "/auth/login",
      { email: "admin@example.com", password: "wrong" },
    );

    await act(async () => {
      void result.current.cancellableApi.post("auth-login", "/auth/login", {
        email: "admin@example.com",
        password: "right",
      });
      await expect(firstRequest).rejects.toThrow("Aborted");
    });

    expect(result.current.isPending("auth-login")).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending("auth-login")).toBe(false);
    });
  });
});
