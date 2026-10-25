# Indexación del catálogo

## Qué se mantiene automáticamente

| Recurso        | Comportamiento                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `/sitemap.xml` | Portada, catálogo, índice de categorías, categorías visibles y fichas públicas.                                 |
| `/robots.txt`  | Permite rastrear la tienda, excluye API e indica el sitemap.                                                    |
| Canónica       | Dominio principal `https://www.silentium-hogar.com`, ruta actual y parámetros normalizados cuando corresponden. |
| `noindex`      | Cuenta, carrito, acceso, administración, autenticación y búsquedas/filtros/ordenaciones del catálogo.           |

Publicar, archivar, eliminar o cambiar el slug no requiere editar XML ni desplegar. El sitemap consulta la base de datos con las mismas reglas `visibleCategories` y `publicProductWhere` del catálogo: antecesores activos, producto activo/no archivado/no eliminado, categoría visible y al menos una variante activa/no eliminada. El stock cero no retira por sí solo una ficha pública.

Solo se proyectan URL: no contiene precios, stock, costos, usuarios ni datos privados. Se omite `lastmod` porque la fecha del producto no refleja necesariamente cambios de variantes o imágenes; no se inventan fechas en cada solicitud. Una caída de la base no se disfraza como un sitemap vacío correcto.

## Actualización y límites

La ruta se ejecuta bajo demanda, sin consultar la base durante el build. `unstable_cache` guarda **únicamente la lista pública de URL** durante 300 segundos. Al vencer, una solicitud puede recibir la versión anterior mientras se regenera en segundo plano. No es una tarea programada ni una garantía de actualización de Google en cinco minutos. El catálogo, stock, sesión y administración no reciben una caché compartida nueva.

Si se supera el límite de 50.000 URL, la generación falla explícitamente para evitar una lista truncada. Antes de alcanzar ese volumen hay que implementar un índice con varios sitemaps. Los enlaces de la tienda permiten descubrir fichas aunque Google no procese inmediatamente el sitemap.

## Canónicas, filtros y paginación

- Las fichas y categorías usan su slug actual, escapado como segmento de URL. No se confía en `Host`, cabeceras reenviadas ni parámetros de retorno para construir el dominio.
- Parámetros de seguimiento como `utm_source` no forman parte de la canónica.
- Búsqueda, categoría seleccionada en filtros, precio, disponibilidad, ofertas y ordenación: `noindex, follow`, con canónica propia normalizada; no se presentan como duplicados de un listado diferente.
- Una página 2 válida conserva `?page=2`. Si la tienda ajusta una página fuera de rango a la última existente, la canónica usa esa página real. No se fuerza toda la paginación a la portada del catálogo.
- Metadatos y contenido comparten una lectura por solicitud mediante `React.cache` y claves primitivas normalizadas. No es una caché entre usuarios o solicitudes.
- Las redirecciones `/colecciones`, `/ofertas`, `/nosotros` y `/contacto`, los filtros y los fragmentos de landing no se incluyen en el sitemap.

## Producción y páginas privadas

Solo `VERCEL_ENV=production` habilita la indexación. Desarrollo, pruebas y previews fallan de forma cerrada: sitemap vacío, robots con `Disallow: /`, metadatos y cabeceras `noindex`. Para otro proveedor será necesario adaptar explícitamente esa condición. No habilitarla en previews por conveniencia.

El origen está centralizado en `seo_rules.ts` y coincide con `APP_PUBLIC_URL` ya configurada para la tienda. Si cambia el dominio, actualizar ambos y planear las redirecciones. Nunca usar el dominio temporal de un despliegue como canónica.

Las páginas privadas reciben `X-Robots-Tag` incluso en redirecciones de acceso; las pantallas de acceso y administración también tienen metadatos `noindex`. No se bloquea su rastreo en robots para no impedir la lectura de esa instrucción. Las API sí se excluyen del rastreo; una URL bloqueada por robots no garantiza por sí sola su eliminación de resultados. Autenticación, permisos y respuestas privadas/sin caché siguen siendo la protección real.

Los metadatos públicos `/robots.txt` y `/sitemap.xml` quedan fuera del middleware de sesión: no leen cookies ni refrescan Auth. No se relajan las protecciones de rutas de usuario o API.

## Cómo comprobarlo

1. Ejecutar Jest, lint y build. No correr las integraciones que crean fixtures contra la base compartida.
2. En un build con entorno de producción, abrir ambos recursos sin sesión. Confirmar XML válido y solo URL públicas del dominio principal.
3. Revisar HTML de portada, ficha, categoría, catálogo, filtros, parámetros de campaña, página 2 y página fuera de rango. Comprobar canónica única y robots.
4. Verificar `noindex` en login, registro, carrito y redirecciones de cuenta/admin; conservar `401` en las API protegidas.
5. Comprobar también un build preview sin indexación. No modificar productos reales para probar cambios de estado: las pruebas de consulta simulada cubren visibilidad, regeneración y errores.

Después del despliegue se podrá verificar el dominio en Search Console y enviar el sitemap. Esto no configura Search Console, no instala Analytics y no garantiza posiciones en Google.

## Verificación realizada

- Suite completa: 150 suites y 906 pruebas pasan; 12 suites/63 integraciones omitidas. Lint, formato y builds con `VERCEL_ENV=production` y `VERCEL_ENV=preview` correctos.
- Build en modo producción: 38 URL únicas del catálogo actual, todas responden `200` en el recorrido de solo lectura. Sitemap y robots no generan cookies; se comprobó la entrada de caché con revalidación de 300 segundos.
- HTML con una canónica por página; seguimiento eliminado, filtros `noindex, follow`, página 2 independiente y página fuera de rango normalizada a la página real. Login, registro y carrito tienen `noindex`; cuenta/admin conservan esa cabecera al redirigir y sus API protegidas mantienen `401`.
- Build preview: sitemap vacío, robots bloqueando rastreo, portada con metadatos y cabecera `noindex`. Ningún dato del catálogo se incluye en ese sitemap.
- Chrome: XML legible y catálogo filtrado funcional; DOM con canónica y robots esperados. Se observaron errores de extensiones externas (AdBlock/DeepL), no de código de la aplicación. No se modificaron productos, stock, pedidos, usuarios ni carritos.

Estas comprobaciones son locales sobre builds compilados, no una confirmación de despliegue ni de indexación en Google.
