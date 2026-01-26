import { ApiResponse } from "@/types/api-service/api_response";
import { apiService } from "@/types/api-service/api_service";
import { useCallback, useEffect, useMemo, useRef } from "react";

export interface UseCancellableApiOptions {
  autoCleanup?: boolean;
}

export interface CancellableApi {
  get<T extends ApiResponse<T["data"]>, K>(
    id: string,
    endpoint: string,
    params?: K,
    successMessage?: string,
  ): Promise<T["data"] | undefined>;
  post<T extends ApiResponse<T["data"]>, K>(
    id: string,
    endpoint: string,
    params: K,
    successMessage?: string,
  ): Promise<T["data"] | undefined>;
  put<T extends ApiResponse<T["data"]>, K>(
    id: string,
    endpoint: string,
    params: K,
    successMessage?: string,
  ): Promise<T["data"] | undefined>;
  patch<T extends ApiResponse<T["data"]>, K>(
    id: string,
    endpoint: string,
    params: K,
    successMessage?: string,
  ): Promise<T["data"] | undefined>;
  delete<T extends ApiResponse<T["data"]>, K>(
    id: string,
    endpoint: string,
    params?: K,
    successMessage?: string,
  ): Promise<T["data"] | undefined>;
}

export function useCancellableApi(options: UseCancellableApiOptions = {}): {
  cancellableApi: CancellableApi;
  abort: (id: string) => void;
  abortAll: () => void;
  isPending: (id: string) => boolean;
} {
  const { autoCleanup = true } = options;
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  // Limpiar controllers completados del Map
  const cleanupCompleted = useCallback((id: string) => {
    controllersRef.current.delete(id);
  }, []);

  // Crear o reutilizar controller para un ID, cancelando el anterior si existe
  const getOrCreateController = useCallback((id: string): AbortSignal => {
    const existingController = controllersRef.current.get(id);
    if (existingController) {
      existingController.abort();
    }

    const newController = new AbortController();
    controllersRef.current.set(id, newController);
    return newController.signal;
  }, []);

  const getFn = useCallback(
    async <T extends ApiResponse<T["data"]>, K>(
      id: string,
      endpoint: string,
      params?: K,
      successMessage?: string,
    ): Promise<T["data"] | undefined> => {
      const signal = getOrCreateController(id);
      try {
        const result = await apiService.get<T, K>(
          endpoint,
          params,
          successMessage,
          signal,
        );
        cleanupCompleted(id);
        return result;
      } catch (error) {
        // Si fue cancelado, limpiar y relanzar
        if (error instanceof Error && error.name === "AbortError") {
          cleanupCompleted(id);
        }
        throw error;
      }
    },
    [getOrCreateController, cleanupCompleted],
  );

  const postFn = useCallback(
    async <T extends ApiResponse<T["data"]>, K>(
      id: string,
      endpoint: string,
      params: K,
      successMessage?: string,
    ): Promise<T["data"] | undefined> => {
      const signal = getOrCreateController(id);
      try {
        const result = await apiService.post<T, K>(
          endpoint,
          params,
          successMessage,
          signal,
        );
        cleanupCompleted(id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          cleanupCompleted(id);
        }
        throw error;
      }
    },
    [getOrCreateController, cleanupCompleted],
  );

  const putFn = useCallback(
    async <T extends ApiResponse<T["data"]>, K>(
      id: string,
      endpoint: string,
      params: K,
      successMessage?: string,
    ): Promise<T["data"] | undefined> => {
      const signal = getOrCreateController(id);
      try {
        const result = await apiService.put<T, K>(
          endpoint,
          params,
          successMessage,
          signal,
        );
        cleanupCompleted(id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          cleanupCompleted(id);
        }
        throw error;
      }
    },
    [getOrCreateController, cleanupCompleted],
  );

  const patchFn = useCallback(
    async <T extends ApiResponse<T["data"]>, K>(
      id: string,
      endpoint: string,
      params: K,
      successMessage?: string,
    ): Promise<T["data"] | undefined> => {
      const signal = getOrCreateController(id);
      try {
        const result = await apiService.patch<T, K>(
          endpoint,
          params,
          successMessage,
          signal,
        );
        cleanupCompleted(id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          cleanupCompleted(id);
        }
        throw error;
      }
    },
    [getOrCreateController, cleanupCompleted],
  );

  const deleteFn = useCallback(
    async <T extends ApiResponse<T["data"]>, K>(
      id: string,
      endpoint: string,
      params?: K,
      successMessage?: string,
    ): Promise<T["data"] | undefined> => {
      const signal = getOrCreateController(id);
      try {
        const result = await apiService.delete<T, K>(
          endpoint,
          params,
          successMessage,
          signal,
        );
        cleanupCompleted(id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          cleanupCompleted(id);
        }
        throw error;
      }
    },
    [getOrCreateController, cleanupCompleted],
  );

  const cancellableApi: CancellableApi = useMemo(
    () => ({
      get: getFn,
      post: postFn,
      put: putFn,
      patch: patchFn,
      delete: deleteFn,
    }),
    [getFn, postFn, putFn, patchFn, deleteFn],
  );

  const abort = useCallback(
    (id: string) => {
      const controller = controllersRef.current.get(id);
      if (controller) {
        controller.abort();
        cleanupCompleted(id);
      }
    },
    [cleanupCompleted],
  );

  const abortAll = useCallback(() => {
    controllersRef.current.forEach((controller) => {
      controller.abort();
    });
    controllersRef.current.clear();
  }, []);

  const isPending = useCallback((id: string): boolean => {
    return controllersRef.current.has(id);
  }, []);

  // Cleanup automático al desmontar el componente
  useEffect(() => {
    if (!autoCleanup) return;

    return () => {
      abortAll();
    };
  }, [autoCleanup, abortAll]);

  return {
    cancellableApi,
    abort,
    abortAll,
    isPending,
  };
}
