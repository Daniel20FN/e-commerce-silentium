# Google Search Console — configuración inicial y seguimiento

**Estado a 28/10/2026: propiedad verificada con la cuenta de Silentium y acceso personal conservado.** La base técnica SEO está desplegada. Sitemap enviado y procesado correctamente por Google (10 páginas descubiertas). La portada ya consta indexada y se solicitó actualizarla tras comprobar la versión publicada; las solicitudes iniciales de los listados se registran debajo. Descubrir o solicitar no significa que todas las páginas estén indexadas.

## Punto de partida

- Dominio: `silentium-hogar.com`.
- Dirección principal: https://www.silentium-hogar.com/.
- Cuenta de la tienda: **silentium.hogar@gmail.com** (Diana Moreno), propietaria verificada independiente por DNS. La cuenta personal de Daniel permanece también como propietaria verificada y respaldo, según autorización explícita.
- DNS del dominio: Cloudflare. Alojamiento de la web: Vercel.
- Base técnica publicada mediante [PR #33](https://github.com/Daniel20FN/e-commerce-silentium/pull/33): sitemap automático, robots, canónicas y exclusión de páginas privadas/filtros/previews.
- Verificación histórica de PR #33: 38 URL públicas respondían correctamente. Tras reducir el catálogo a ejemplos y publicar las páginas legales, esa cifra ya no representa el catálogo actual ni acredita indexación en Google.

Detalles técnicos: [Indexación del catálogo](technical-seo.md).

## Configuración y seguimiento

### 1. Cuenta y propiedad

- [x] Acceso confirmado en [Search Console](https://search.google.com/search-console) con `silentium.hogar@gmail.com`.
- [ ] Confirmar que la tienda controla esa cuenta y revisar recuperación y verificación en dos pasos. No registrar contraseñas ni códigos en este documento.
- [x] Reutilizada la propiedad de tipo **Dominio** `silentium-hogar.com`; no se creó un duplicado ni se borró el histórico.
- [x] Con autorización expresa, añadido un TXT raíz propio de la cuenta de Silentium, TTL Auto. Se eligió verificación manual, sin autorizar a Google acceso general a Cloudflare. Registros totales: 11 → 12; Vercel, Resend, correo y el TXT personal anterior intactos.
- [x] Google confirmó «Propiedad verificada» mediante proveedor de nombres de dominio. Conservar ambos TXT de Google para mantener las dos verificaciones.
- [x] Lista final de usuarios revisada desde la cuenta de la tienda: Diana/tienda y Daniel/personal figuran ambos como «Propietario Verificado». El usuario autorizó expresamente conservar el acceso personal como respaldo. No se compartieron contraseñas.

### 2. Sitemap e indexación inicial

- [x] Enviado una sola vez desde la cuenta de Silentium el 28/10/2026: https://www.silentium-hogar.com/sitemap.xml.
- [x] Google confirmó «El sitemap se ha procesado correctamente», última lectura 28/10/26, 10 páginas descubiertas y 0 vídeos. El aviso inicial «No se ha podido obtener» fue transitorio y se resolvió sin reenviar ni cambiar la web.
- [ ] Revisar que el catálogo público tenga información y fotografías definitivas antes de solicitar indexación de fichas que aún sean de demostración.
- [x] Portada inspeccionada: «La URL está en Google» / «La página está indexada»; último rastreo mostrado 25/10/2026 con Googlebot smartphone, obtención correcta, rastreo/indexación permitidos y canónica de Google coincidente con `https://www.silentium-hogar.com/`. Prueba publicada actual: «La URL está disponible para Google» / «La página se puede indexar».
- [ ] Inspeccionar fichas definitivas de categoría y producto real cuando sustituyan los ejemplos actuales; no se han solicitado individualmente esas fichas.
- [x] Solicitada una actualización de la portada y la primera indexación del listado `/productos`; Google confirmó su inclusión en una cola de rastreo prioritaria tras las comprobaciones. No repetir solicitudes para intentar subir prioridad.
- [x] `/categorias`: prueba publicada del 28/10/2026 a las 23:09 superada («La URL está disponible para Google» / «La página se puede indexar»). Google confirmó «Se ha solicitado la indexación» e inclusión en cola prioritaria. Un fallo inicial de conexión del servicio reCAPTCHA se resolvió recargando y realizando la prueba publicada; no se resolvió ningún reto interactivo. Solicitud aceptada no equivale todavía a página indexada.
- [x] Informes «Acciones manuales» y «Problemas de seguridad» revisados el 28/10/2026: ambos muestran «No se ha detectado ningún problema».

### 3. Seguimiento posterior

- [x] Revisado el informe de indexación: su fecha de actualización mostrada es 23/10/26 y aún contiene dos entradas «Rastreada: actualmente sin indexar», para `http://silentium-hogar.com/` y `https://www.silentium-hogar.com/` (rastreo 25/10). No es el estado actual de todas las URL: la inspección individual de la portada ya confirma indexación. Verificada la cadena actual HTTP raíz → HTTPS raíz → HTTPS `www`, con redirecciones permanentes 308 y destino 200.
- [x] Solicitada revisión del grupo anterior: Google confirmó «Resultado de la validación: iniciada», fecha 28/10/26. No se da por superada hasta que Google termine.
- [ ] Revisar el resultado de esa validación y la evolución del informe tras los siguientes rastreos; no repetir solicitudes para acelerar la cola.
- [ ] Comprobar productos nuevos o cambios importantes cuando Google haya tenido tiempo de volver a rastrearlos.
- [ ] Cuando existan datos, revisar impresiones, clics y consultas de búsqueda. No confundir estar indexado con aparecer en primeras posiciones.

## Alcance del sitemap actual

La comprobación HTTP de solo lectura del 28/10/2026 encontró 10 URL únicas: portada, listados de productos/categorías, cuatro documentos legales, dos categorías de ejemplo y un producto de ejemplo. Todas respondieron 200, con canónica propia bajo `www`, sin filtros/fragmentos/páginas privadas y sin `noindex`. `robots.txt` permite el sitio, excluye `/api/` y declara el XML canónico.

**Las fichas de ejemplo sí están en el sitemap público y Google podría rastrearlas.** No se ocultaron ni se retiraron del índice; simplemente no se enviaron solicitudes individuales para ellas. Revisar fotografías y referencias definitivas antes del lanzamiento comercial. Publicar productos reales actualizará el sitemap automáticamente; no exige reenviarlo por cada alta.

## Qué ya es automático y qué no

La web mantiene la lista de productos y categorías públicos sin editar XML ni desplegar por cada producto. El sitemap cachea solo URL durante 300 segundos y se regenera bajo demanda; una solicitud puede recibir la lista anterior mientras se actualiza.

**Esto no programa a Google cada cinco minutos.** Google elige cuándo rastrear e indexar. Tras enviar correctamente el sitemap, seguirá revisándolo a su propio ritmo: no hay que enviarlo por cada producto ni crear una tarea periódica para forzar indexaciones. Los cambios pueden tardar días o semanas y no se garantiza la inclusión de todas las páginas.

## Fuera de esta tarea

- Google Analytics sigue pendiente y no es necesario para indexar la tienda. Antes de añadir seguimiento, revisar privacidad y consentimiento.
- Las mejoras de contenido y posicionamiento continúan aparte. La web ya publica datos estructurados según la implementación de GEO; enviarla a Search Console no sustituye la calidad del catálogo ni garantiza posiciones.
- El 28/10/2026 se verificó la cuenta de Silentium conservando la personal, se envió el sitemap y se tramitaron las solicitudes descritas. No se cambiaron recuperación, contraseñas, verificación en dos pasos, registros de correo ni catálogo.

## Referencias

- [Verificar la propiedad del sitio](https://support.google.com/webmasters/answer/9008080).
- [Enviar y revisar sitemaps](https://support.google.com/webmasters/answer/7451001).
- [Solicitar un nuevo rastreo](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
