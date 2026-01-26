import { enqueueSnackbar } from "notistack";
import { ApiResponse } from "./api_response";

export class ApiService {
  private baseUrl = "/api";
  private static instance: ApiService;

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Método privado para centralizar las peticiones HTTP.
   *
   * @type T Tipo que llegará desde la API.
   * @type K Tipo de los parámetros que se enviarán a la API.
   * @param method Método HTTP a utilizar.
   * @param endpoint Ruta de la API sin `/api`.
   * @param params Parámetros que se enviarán (en query o body).
   * @param successMessage Mensaje opcional de éxito a mostrar con notistack.
   * @param signal Señal opcional para cancelar la petición.
   * @returns `T["data"]` o `undefined`.
   */
  private async request<T extends ApiResponse<T["data"]>, K>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    endpoint: string,
    params?: K,
    successMessage?: string,
    signal?: AbortSignal,
  ): Promise<T["data"] | undefined> {
    try {
      const url =
        method === "GET" && params
          ? `${this.baseUrl}${endpoint}?params=${encodeURIComponent(JSON.stringify(params))}`
          : `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(method !== "GET" && params ? { body: JSON.stringify(params) } : {}),
        ...(signal ? { signal } : {}),
      });

      const dataResponse = (await response.json()) as T;

      if (dataResponse.type) {
        throw new Error(dataResponse.message);
      }

      if (successMessage) {
        enqueueSnackbar(successMessage, {
          variant: "success",
          preventDuplicate: true,
          autoHideDuration: 1500,
        });
      }

      return dataResponse.data;
    } catch (error) {
      // Si la petición fue cancelada, no mostrar error ni log
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      console.error(error);
      throw new Error(
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Internal Server Error",
      );
    }
  }

  /**
   * Realiza una petición GET.
   *
   * @example
   * // En la API:
   * const { params } = req.query;
   * const parsedParams = JSON.parse(decodeURIComponent(params));
   *
   * @type T Tipo que llegará desde la API.
   * @type K Tipo de los parámetros a enviar en query.
   * @param signal Señal opcional para cancelar la petición.
   */
  async get<T extends ApiResponse<T["data"]>, K>(
    endpoint: string,
    params?: K,
    successMessage?: string,
    signal?: AbortSignal,
  ): Promise<T["data"] | undefined> {
    return this.request<T, K>("GET", endpoint, params, successMessage, signal);
  }

  /**
   * Realiza una petición POST.
   *
   * @example
   * // En la API:
   * const params = req.body;
   * const { myObject }: GetTypeApiParams = params;
   *
   * @type T Tipo que llegará desde la API.
   * @type K Tipo de los parámetros a enviar en el body.
   * @param signal Señal opcional para cancelar la petición.
   */
  async post<T extends ApiResponse<T["data"]>, K>(
    endpoint: string,
    params: K,
    successMessage?: string,
    signal?: AbortSignal,
  ): Promise<T["data"] | undefined> {
    return this.request<T, K>("POST", endpoint, params, successMessage, signal);
  }

  /**
   * Realiza una petición PUT.
   *
   * @example
   * // En la API:
   * const params = req.body;
   * const { updatedData }: UpdateTypeApiParams = params;
   *
   * @type T Tipo que llegará desde la API.
   * @type K Tipo de los parámetros a enviar en el body.
   * @param signal Señal opcional para cancelar la petición.
   */
  async put<T extends ApiResponse<T["data"]>, K>(
    endpoint: string,
    params: K,
    successMessage?: string,
    signal?: AbortSignal,
  ): Promise<T["data"] | undefined> {
    return this.request<T, K>("PUT", endpoint, params, successMessage, signal);
  }

  /**
   * Realiza una petición PATCH.
   *
   * @example
   * // En la API:
   * const params = req.body;
   * const { partialUpdate }: PatchTypeApiParams = params;
   *
   * @type T Tipo que llegará desde la API.
   * @type K Tipo de los parámetros a enviar en el body.
   * @param signal Señal opcional para cancelar la petición.
   */
  async patch<T extends ApiResponse<T["data"]>, K>(
    endpoint: string,
    params: K,
    successMessage?: string,
    signal?: AbortSignal,
  ): Promise<T["data"] | undefined> {
    return this.request<T, K>(
      "PATCH",
      endpoint,
      params,
      successMessage,
      signal,
    );
  }

  /**
   * Realiza una petición DELETE.
   *
   * @example
   * // En la API:
   * const params = req.body;
   * const { id }: DeleteTypeApiParams = params;
   *
   * @type T Tipo que llegará desde la API.
   * @type K Tipo de los parámetros a enviar en el body.
   * @param signal Señal opcional para cancelar la petición.
   */
  async delete<T extends ApiResponse<T["data"]>, K>(
    endpoint: string,
    params?: K,
    successMessage?: string,
    signal?: AbortSignal,
  ): Promise<T["data"] | undefined> {
    return this.request<T, K>(
      "DELETE",
      endpoint,
      params,
      successMessage,
      signal,
    );
  }
}

export const apiService = ApiService.getInstance();
