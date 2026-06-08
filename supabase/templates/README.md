# Plantillas de email de Supabase

Plantillas de correo de autenticación con la estética de Silentium.

## Confirmación de registro (`confirm-signup.html`)

Es la plantilla del correo que recibe el usuario al registrarse (flujo
`signUp` en `src/app/api/auth/register/route.ts`).

### Cómo aplicarla

1. Entra al **Dashboard de Supabase → Authentication → Emails**.
2. Selecciona la plantilla **"Confirm signup"**.
3. **Asunto sugerido:** `Confirma tu cuenta en Silentium`
4. Pega el contenido de `confirm-signup.html` en el cuerpo del mensaje.
5. Guarda.

### Por qué el enlace apunta a `/auth/confirm`

La app usa el flujo SSR de Supabase: la ruta `src/app/auth/confirm/route.ts`
valida el correo con `verifyOtp` usando `token_hash` y `type`. Por eso la
plantilla **no** usa `{{ .ConfirmationURL }}` por defecto, sino:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

### Configuración necesaria en Supabase (URL Configuration)

Para que `{{ .SiteURL }}` y el redirect resuelvan bien:

- **Site URL:** la URL pública de la app (p. ej. `https://tudominio.com`).
  En local suele ser `http://localhost:3000`.
- **Redirect URLs:** añade a la allowlist:
  - `http://localhost:3000/auth/confirm`
  - `https://tudominio.com/auth/confirm`

Si la `Site URL` o las `Redirect URLs` no coinciden, el enlace del correo
fallará o redirigirá a `/auth/auth-code-error`.

## Otras plantillas (pendientes)

La ruta `/auth/confirm` ya soporta también `recovery` (reset de contraseña),
`magiclink`, `invite` y `email_change`. Si las necesitas, se pueden generar
con el mismo diseño cambiando el texto y el parámetro `type` del enlace.
