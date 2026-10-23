# Invitar usuarios desde el panel

Solo un **superadministrador activo con correo verificado** puede invitar personas. El correo se envía mediante Supabase Auth, con el proveedor ya configurado en el proyecto. No se generan ni comparten contraseñas.

## Uso

1. Abre **Usuarios → Invitar usuario**.
2. Introduce nombre, apellidos, correo y rol. Para gestionar la tienda, elige **Administrador**.
3. Confirma el envío. El mensaje de éxito significa que Supabase aceptó la solicitud, no que el correo haya llegado.
4. La persona abre el correo, establece una contraseña y acepta las condiciones personalmente.
5. El servidor activa el rol y abre el panel. Antes de ese paso no tiene permisos administrativos.

La invitación de la aplicación dura **una hora**; Supabase puede invalidar su enlace antes según su configuración. Para reenviar, utiliza el formulario con los mismos datos y espera al menos un minuto entre intentos. Un envío en curso se protege con una reserva de dos minutos. Nunca se modifican los permisos de una cuenta ya registrada mediante este formulario: se gestionan desde Usuarios.

## Configurar el despliegue

- Aplica las migraciones con el procedimiento existente `npm run prisma:migrate:deploy:production` antes de publicar el código. La migración añade exclusivamente la tabla privada `AdminUserInvitation`, protegida con RLS y sin permisos para `anon` ni `authenticated`.
- Configura `APP_PUBLIC_URL` con el origen HTTPS público, sin rutas ni parámetros, por ejemplo `https://www.silentium-hogar.com`. En Vercel se puede usar como alternativa su variable automática `VERCEL_PROJECT_PRODUCTION_URL`. No se toma una dirección de retorno del formulario o de cabeceras proporcionadas por el cliente.
- En **Supabase → Authentication → URL Configuration**, autoriza exactamente `https://www.silentium-hogar.com/auth/invitacion`, o la misma ruta en el dominio público configurado. Comprueba también el Site URL de producción. No uses comodines de dominio ni localhost para invitaciones reales.
- La plantilla predeterminada **Invite user**, con `{{ .ConfirmationURL }}`, funciona mediante la sesión del fragmento de URL. La página limpia ese fragmento y establece la sesión mediante el cliente público de Supabase. No hace falta cambiar la plantilla.
- Si ya utilizas una plantilla SSR personalizada, puede verificar `token_hash` con `type=invite` en `/auth/confirm`; ese caso ahora termina en `/auth/invitacion`, no en login. Las confirmaciones normales siguen igual.
- Si una persona confirmó el correo pero abandonó la activación, el reenvío de su invitación pendiente usa el correo de recuperación de Supabase para permitirle terminar la contraseña. Solo se permite para la misma invitación no consumida y el mismo usuario de Auth; nunca para cuentas ya completadas. Una plantilla SSR de recuperación debe conservar `next=/auth/invitacion` para este caso.

## SMTP de Silentium

El proyecto utiliza Resend mediante SMTP de Supabase, con el remitente Silentium <no-reply@notificaciones.silentium-hogar.com>. El subdominio de envío está separado del reenvío de contacto@silentium-hogar.com. Las claves permanecen en la configuración privada, nunca en el repositorio. La recepción y activación final se comprueban con una invitación real por el operador.

## Correo predeterminado de Supabase

El servicio incorporado es de pruebas: restringe destinatarios a miembros autorizados del equipo y tiene límites de envío bajos. Tener una plantilla configurada **no** habilita el envío a cualquier dirección.

Si se rechaza un destinatario, el panel explica que hace falta SMTP. **No añadas al gestor de la tienda al equipo de Supabase para evitar la restricción**: eso concedería acceso a infraestructura que no necesita. No se cambia de proveedor ni se reduce la seguridad automáticamente.

## Garantías y límites

- El rol se guarda en la base de datos privada, nunca en `user_metadata` editable.
- El enlace no contiene el rol elegido por el cliente. La aceptación verifica una sesión confirmada, su identificador de Auth, el correo normalizado, el envío registrado y la caducidad.
- La contraseña se actualiza antes de conceder el rol. La aceptación y el rol se guardan en una transacción con control de revisión; un enlace consumido no vuelve a asignar permisos ni revierte cambios posteriores del superadmin.
- Un fallo de correo o de persistencia no se presenta como éxito ni concede permisos. No se eliminan cuentas de Auth automáticamente para compensar fallos inciertos de red.
- Antes de enviar, se prepara el usuario de Auth con `generateLink` (sin correo) y se guarda su identificador en la invitación privada. El enlace generado se descarta: no se entrega al panel ni se guarda. Esto permite recuperar un envío cuyo correo salió pero cuya confirmación de persistencia falló, sin perder la relación con la cuenta. El envío real se solicita después con `inviteUserByEmail` o, para una activación pendiente ya confirmada, con recuperación.
- Si Auth guardó la contraseña y falló después la transacción, se puede reintentar; la respuesta `same_password` permite completar ese caso sin compartir credenciales.
- No se guardan contraseñas, tokens de invitación o enlaces de acceso en la tabla, respuestas, registros de error o documentación.
- Los estados manuales **Bloqueado** e **Inactivo** se conservan durante la sincronización de sesión y no se sobrescriben para aceptar una invitación. Esto no sustituye una futura revisión global de los guardas históricos del panel.

## Eliminar una cuenta

En **Usuarios → Eliminar cuenta**, escribe el correo de la persona y confirma **Eliminar definitivamente**. Solo un superadministrador activo y verificado puede hacerlo. No puedes eliminar tu propia cuenta; el servidor vuelve a comprobar al operador bajo bloqueo de filas antes de borrar otra cuenta.

Se borran permanentemente la identidad de Supabase Auth, el usuario local, su perfil, direcciones, preferencias y las invitaciones dirigidas a esa identidad. Los pedidos y el historial operativo no se borran ni se anonimizan: conservan sus instantáneas e identificadores históricos. Una cuenta que haya emitido invitaciones no se puede borrar mientras exista esa relación, para no perder la autoría. No se eliminan archivos de Storage automáticamente; si Supabase rechaza el borrado, la operación local se revierte.

Auth y PostgreSQL no comparten una transacción. Se preparan los borrados locales dentro de una transacción y se solicita el borrado de Auth al final. Si falla la confirmación final de PostgreSQL después de borrar Auth, se muestra un error y se puede reintentar; una identidad de Auth ya inexistente permite completar la limpieza. No se anuncia éxito ante un resultado incierto. El borrado no garantiza invalidar instantáneamente todos los JWT emitidos por Supabase en servicios externos; la aplicación consulta `getUser()` al resolver la sesión.

## Pruebas de invitaciones

Las pruebas unitarias cubren autorización, consentimiento, rol almacenado, caducidad, repetición, conflictos, errores de SMTP y aceptación desde el enlace predeterminado en React StrictMode. La comprobación real de recepción y activación completa requiere un destinatario autorizado por Supabase o SMTP propio; no se simula como si un correo real hubiera sido entregado.

Referencias: [invitaciones](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [correo predeterminado y SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [plantillas](https://supabase.com/docs/guides/auth/auth-email-templates).
