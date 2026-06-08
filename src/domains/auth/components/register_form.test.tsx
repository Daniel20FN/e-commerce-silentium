import { useCancellableApiContext } from "@/context/use_cancellable_api_context";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterForm } from "./register_form";

jest.mock("@/context/use_cancellable_api_context", () => ({
  useCancellableApiContext: jest.fn(),
}));

const mockUseCancellableApiContext = jest.mocked(useCancellableApiContext);
const mockPost = jest.fn();

const dictionary = {
  auth: {
    common: {
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Email",
      password: "Contrase�a",
      acceptTerms: "Acepto los t�rminos",
      requiredField: "Requerido",
      invalidEmail: "Email inv�lido",
      passwordMinLength: "Contrase�a corta",
    },
    register: {
      submit: "Crear cuenta",
      submitting: "Creando cuenta...",
      loginPrompt: "�Ya tienes cuenta?",
      loginLink: "Inicia sesi�n",
      successTitle: "Revisa tu correo",
      successDescription: "Te enviamos un enlace de confirmaci�n a",
      successHint: "Confirma tu correo",
      resendButton: "Reenviar correo",
      resendSubmitting: "Reenviando correo...",
      resendCooldown: "Puedes solicitar otro correo en {seconds}s.",
      resendInitialCooldown: "Ya te enviamos un correo.",
      resendSuccess: "Listo.",
      acceptsMarketingEmails: "Quiero recibir promociones por email",
      acceptsWhatsAppMarketing: "Quiero recibir promociones por WhatsApp",
    },
    errors: {
      accept_terms_required: "Debes aceptar t�rminos",
      unexpected_auth_error: "Error inesperado",
    },
  },
};

describe("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({
      requiresEmailConfirmation: true,
      email: "cliente@example.com",
    });
    mockUseCancellableApiContext.mockReturnValue({
      cancellableApi: {
        get: jest.fn(),
        post: mockPost,
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      },
      abort: jest.fn(),
      abortAll: jest.fn(),
      isPending: jest.fn().mockReturnValue(false),
    });
  });

  it("submits optional marketing consent separately from required terms", async () => {
    render(<RegisterForm dictionary={dictionary as never} />);

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Ana" },
    });
    fireEvent.change(screen.getByLabelText("Apellido"), {
      target: { value: "P�rez" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "CLIENTE@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contrase�a"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByLabelText("Acepto los t�rminos"));
    fireEvent.click(
      screen.getByLabelText("Quiero recibir promociones por email"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("auth-register", "/auth/register", {
        email: "CLIENTE@example.com",
        password: "password123",
        firstName: "Ana",
        lastName: "P�rez",
        acceptTerms: true,
        acceptsMarketingEmails: true,
        acceptsWhatsAppMarketing: false,
      });
    });
  });
});
