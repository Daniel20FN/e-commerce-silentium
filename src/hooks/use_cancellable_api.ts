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
  const cleanupCompleted = useCallback(
    (id: string, controller?: AbortController) => {
      if (controller && controllersRef.current.get(id) !== controller) {
        return;
      }

      controllersRef.current.delete(id);
    },
    [],
  );

  // Crear o reutilizar controller para un ID, cancelando el anterior si existe
  const getOrCreateController = useCallback((id: string): AbortController => {
    const existingController = controllersRef.current.get(id);
    if (existingController) {
      existingController.abort();
    }

    const newController = new AbortController();
    controllersRef.current.set(id, newController);
    return newController;
  }, []);

  const getFn = useCallback(
    async <T extends ApiResponse<T["data"]>, K>(
      id: string,
      endpoint: string,
      params?: K,
      successMessage?: string,
    ): Promise<T["data"] | undefined> => {
      const controller = getOrCreateController(id);
      try {
        return await apiService.get<T, K>(
          endpoint,
          params,
          successMessage,
          controller.signal,
        );
      } finally {
        cleanupCompleted(id, controller);
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
      const controller = getOrCreateController(id);
      try {
        return await apiService.post<T, K>(
          endpoint,
          params,
          successMessage,
          controller.signal,
        );
      } finally {
        cleanupCompleted(id, controller);
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
      const controller = getOrCreateController(id);
      try {
        return await apiService.put<T, K>(
          endpoint,
          params,
          successMessage,
          controller.signal,
        );
      } finally {
        cleanupCompleted(id, controller);
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
      const controller = getOrCreateController(id);
      try {
        return await apiService.patch<T, K>(
          endpoint,
          params,
          successMessage,
          controller.signal,
        );
      } finally {
        cleanupCompleted(id, controller);
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
      const controller = getOrCreateController(id);
      try {
        return await apiService.delete<T, K>(
          endpoint,
          params,
          successMessage,
          controller.signal,
        );
      } finally {
        cleanupCompleted(id, controller);
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
