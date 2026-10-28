# Cookies y almacenamiento del navegador — borrador

**BORRADOR — NO PUBLICAR.** Inventario de código a 27/10/2026, no medición completa en producción. No acredita ausencia de rastreadores ni fija duraciones no comprobadas.

## Qué utiliza el sitio según el código

Además de cookies, la aplicación utiliza almacenamiento local y de sesión. Esas tecnologías no equivalen automáticamente a publicidad ni quedan fuera de protección de datos por ser locales.

| Tecnología y clave                                            | Finalidad                                                     | Duración identificada                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Cookie `theme`                                                | Recordar tema claro/oscuro                                    | El escritor actual no fija caducidad; cookie de sesión del navegador, sujeta a restauración de sesiones                       |
| Cookies de Supabase `sb-*`, eventualmente divididas           | Autenticación y mantenimiento de sesión                       | Duración efectiva pendiente de medir; depende de configuración y renovación de sesión, no se deduce solo de la vida del token |
| localStorage `silentium.cart.v1`                              | Conservar variantes y cantidades del carrito en ese navegador | Sin caducidad automática en el escritor actual; hasta retirada o limpieza                                                     |
| sessionStorage `orders-tab-scope`, `orders-pending:*`         | Recuperar operaciones pendientes de pedidos en administración | Durante la sesión de pestaña y hasta limpieza por la aplicación/navegador; puede incluir datos de cliente y pedido            |
| sessionStorage `inventory-pending:*`, `catalog-duplication:*` | Recuperar ajustes/duplicaciones pendientes de administración  | Sesión de pestaña y limpieza según flujo/navegador                                                                            |

No se ha encontrado integración de Google Analytics, Tag Manager, Meta Pixel, Clarity o Hotjar en la revisión del código. Esto no descarta herramientas activadas desde paneles, cambios posteriores o infraestructura externa. Los enlaces a Instagram y WhatsApp no incorporan un feed o píxel en el código revisado; al abrirlos se aplican también los tratamientos del servicio externo.

Existe configuración de PWA en el proyecto. Su activación real, service worker y CacheStorage en producción están pendientes de inspección, especialmente para descartar almacenamiento indebido de información privada.

## Control y consentimiento

Puedes cambiar el tema, gestionar la sesión y eliminar los datos del sitio desde tu navegador. Limpiarlos puede cerrar la sesión, eliminar el carrito o impedir recuperar operaciones pendientes. La retirada de una autorización no se limita a borrar cookies: también puedes ejercer tus derechos mediante contacto@silentium-hogar.com.

Antes de introducir analítica, publicidad u otros tratamientos opcionales se revisarán sus finalidades, datos, destinatarios y autorización necesaria. Cuando proceda, se bloquearán hasta una elección informada, sin premarcar, con posibilidad equivalente de rechazar y retirar.

No se añadirá un banner meramente decorativo ni se declarará que toda cookie «técnica» está automáticamente exenta de autorización bajo las normas colombianas. La información y autorización del tratamiento de cuenta deben cubrir los usos necesarios cuando sean exigibles; una autorización publicitaria no debe condicionar la compra.

## Pendiente interno

Inspeccionar producción con navegador limpio como invitado y usuario autenticado, midiendo nombres, emisor, finalidad, caducidad, solicitudes externas y cachés sin registrar valores de tokens. Revisar ajustes de Vercel/Cloudflare/Supabase y flujos de cierre de sesión en equipos compartidos. Sustituir esta tabla por el inventario comprobado antes de publicar.

Referencia: [Ley 1581](https://cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm) y [Resolución SIC 14015 de 2021](https://sedeelectronica.sic.gov.co/sites/default/files/estados/072022/RE14015-2021.pdf), sobre tratamiento de datos mediante cookies. La conclusión depende del tratamiento real, no de copiar automáticamente un modelo europeo.
