export class CatalogMediaError extends Error {
  constructor(
    public readonly type:
      | "validation_error"
      | "conflict"
      | "not_found"
      | "invalid_state"
      | "internal_server_error",
    message: string,
  ) {
    super(message);
  }
}
