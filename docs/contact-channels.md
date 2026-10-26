# Canales públicos de contacto

La landing mantiene el contacto en `/#contacto`, sin crear otra página ni un formulario de envío.

| Canal     | Uso                                                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp  | Preparar la conversación de compra; se conserva el flujo existente.                                                                                |
| Teléfono  | Enlace `tel:` existente.                                                                                                                           |
| Correo    | `contacto@silentium-hogar.com`, enlace `mailto:` junto al teléfono. Abre el cliente de correo del visitante; no envía mensajes desde la web.       |
| Instagram | Perfil facilitado por el titular: `https://www.instagram.com/silentium.hogar/`, visible como `@silentium.hogar` en Contacto y en el pie de página. |

Los datos públicos se centralizan en `src/values/sales_contact.ts`; los rótulos están en el diccionario. `Organization`/`ContactPoint` incluyen el correo, y `Organization.sameAs` enlaza únicamente el perfil de Instagram facilitado. No se publican credenciales ni el Gmail al que se reenvía el correo.

Instagram abre una pestaña con `noopener noreferrer`. No se incrusta un feed, un SDK ni un píxel de seguimiento. El parámetro de idioma del enlace original no es necesario para identificar el perfil.

En móvil, teléfono y correo se apilan; el correo puede partirse si falta espacio. El enlace social del pie conserva tipografía de navegación, sin heredar el tamaño del logotipo.

## Verificación

- Regresiones: `npm run test:file -- src/domains/home/components/landing.test.tsx src/domains/storefront/services/structured_data.test.ts`.
- Comprobar Contacto y pie en Chrome móvil/escritorio, destinos de los enlaces, foco visible y ausencia de desbordamiento.
- La prueba del enlace `mailto:` no certifica la entrega del correo ni modifica el routing o SMTP. No enviar un correo real como parte de estas regresiones.
