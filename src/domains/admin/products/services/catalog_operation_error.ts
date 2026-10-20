export class CatalogOperationError extends Error {
  constructor(
    public readonly type:
      | "validation_error"
      | "conflict"
      | "not_found"
      | "invalid_state",
    message: string,
  ) {
    super(message);
    this.name = "CatalogOperationError";
  }
}
