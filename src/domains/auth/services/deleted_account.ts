export const DELETED_ACCOUNT_SUFFIX = "@deleted.invalid";
export function isDeletedAccount(email: string): boolean {
  return typeof email === "string" && email.endsWith(DELETED_ACCOUNT_SUFFIX);
}
