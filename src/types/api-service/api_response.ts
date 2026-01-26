import { Language } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _errorApiResponse = {
  not_allowed_method: "",
  network_error: "",
  no_caller_user: "",
  record_not_found: "",
  internal_server_error: "",
  unknown_error: "",
  unauthorized: "",
  forbidden: "",
  not_found: "",
  validation_error: "",
  conflict: "",
  bad_request: "",
  service_unavailable: "",
  timeout: "",
  not_valid_params: "",
  invalid_state: "",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _infoApiResponse = {};

export type ErrorApiResponseType = keyof typeof _errorApiResponse;
export type InfoApiResponseType = keyof typeof _infoApiResponse;
export type ApiResponseType = ErrorApiResponseType | InfoApiResponseType;

export const errorApiResponseTranslations: {
  [key in ErrorApiResponseType]: { [key in Language]: string };
} = {
  not_allowed_method: { es: "Método no permitido" },
  network_error: { es: "Error de red" },
  no_caller_user: { es: "Usuario Sin loggear" },
  record_not_found: {
    es: "Registro no encontrado",
  },
  internal_server_error: {
    es: "Error en el servidor",
  },
  unknown_error: {
    es: "Error desconocido",
  },
  unauthorized: { es: "No autorizado" },
  forbidden: { es: "No tienes permisos para realizar esta acción" },
  not_found: { es: "Recurso no encontrado" },
  validation_error: { es: "Error de validación en los datos enviados" },
  conflict: { es: "Conflicto: los datos ya existen" },
  bad_request: { es: "Solicitud incorrecta" },
  service_unavailable: { es: "Servicio no disponible en este momento" },
  timeout: { es: "Tiempo de espera agotado" },
  not_valid_params: { es: "Los parámetros no són válidos" },
  invalid_state: { es: "Estado inválido" },
};

export const infoApiResponseTranslations: {
  [key in InfoApiResponseType]: { [key in Language]: string };
} = {};

export const apiResponseTranslations = {
  ...errorApiResponseTranslations,
  ...infoApiResponseTranslations,
};

export type ApiResponse<T> =
  | {
      type: ApiResponseType;
      message?: string;
      data?: never;
    }
  | {
      type?: never;
      message?: never;
      data: T;
    };
