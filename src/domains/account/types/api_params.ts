export interface AccountProfileParams {
  firstName: string;
  lastName: string;
  phone: string;
}
export interface AccountPasswordParams {
  currentPassword: string;
  password: string;
}
export interface AccountDeleteParams {
  currentPassword: string;
  confirmationEmail: string;
}
