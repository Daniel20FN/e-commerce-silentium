# Lectura por agentes y datos estructurados

## Alcance

Mejora técnica del contenido existente, sin rediseñar la landing, crear páginas informativas duplicadas, inventar políticas legales ni abrir API privadas. La nota de IsAgentReady no equivale a posicionamiento, indexación ni citas en respuestas de IA.

El informe actualizado antes de este cambio mostraba **54/100, grado C**: descubrimiento 91, semántica 64, seguridad 40 y datos estructurados 0. Protocolos de agentes figuraban como no evaluados, no como una integración obligatoria pendiente.

## Datos estructurados automáticos

- La portada entrega JSON-LD con `Organization`, `WebSite` y `WebPage`: nombre, URL, logo y teléfono públicos; las secciones de nosotros/contacto se identifican como elementos de la misma página.
- Cada ficha pública entrega `Product` y `Offer` para la variante seleccionada. SKU, precio COP, disponibilidad, atributos y galería coinciden con la selección visible; el JSON-LD se actualiza al cambiarla. La variante inicial ya está descrita en el HTML del servidor.
- Una combinación sin resolver no publica una oferta falsa. La vista previa privada no publica JSON-LD comercial. El servicio recibe solo el DTO público existente, no registros con costos u otros datos internos.
- No se inventan reseñas, GTIN, certificaciones, dirección, datos fiscales, horarios, caducidad del precio, descuentos, envíos gratuitos ni políticas de devolución. La marca del producto solo aparece si está informada.
- El serializador escapa `<` antes de introducir JSON en un script inerte, para impedir que textos del catálogo cierren la etiqueta e inyecten HTML ejecutable.

Esto no añade todavía `ProductGroup` ni enlaces profundos a variantes: no se fabrican URL que la tienda no sabe preseleccionar. Tampoco implica que Google vaya a mostrar resultados enriquecidos o que las fotografías de demostración sean de proveedor verificado.

## Contenido visible sin JavaScript

El informe decía que no había encabezados. El HTML completo sí los contenía, pero la respuesta de la portada dejaba sus 20 encabezados dentro de bloques `hidden` que los scripts de streaming revelaban. En el catálogo solo eran legibles 3 de 30 y en la ficha 3 de 6, sin ejecutar JavaScript.

Se retiran los límites `loading.tsx` global y del catálogo público. El servidor espera los datos necesarios antes de entregar el documento público, de modo que el contenido no dependa de ejecutar un script para salir de un bloque oculto. Se preservan el diseño, la precarga de imágenes, las animaciones y su versión de movimiento reducido.

La navegación sigue mostrando el indicador accesible de `NavigationLink` mientras espera la respuesta; no se introduce una caché compartida de stock o sesiones. Autenticación, administración y cuenta conservan límites de carga propios. El intercambio es un primer byte que puede esperar más a la base de datos: comprobarlo junto con la lectura sin JavaScript, no ocultar esa latencia con datos obsoletos.

La ficha se identifica además como un artículo con un encabezado asociado. No se añaden H1 duplicados ni ARIA redundante a controles nativos para satisfacer el escáner.

## Cabeceras de seguridad

| Cabecera                  | Política                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`  | `nosniff`                                                                                                 |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`; cuenta e invitación mantienen su excepción más estricta `no-referrer`. |
| `X-Frame-Options`         | `SAMEORIGIN`, compatible con la vista previa privada del mismo origen.                                    |
| `Content-Security-Policy` | `base-uri 'self'; object-src 'none'; frame-ancestors 'self'`.                                             |

La CSP es una protección inicial **aplicada**, no un simulacro en modo report-only: restringe URL base, objetos y quién puede incrustar la web. **No es una política estricta de scripts/estilos ni resuelve por sí sola XSS**. No se activan directivas que rompan scripts de Next, Emotion/MUI o integraciones existentes sin una estrategia de nonces/hashes y pruebas específicas. Tampoco se añade una cabecera report-only sin un plan real de observación y tratamiento de datos de los informes.

No se cambian HSTS, `includeSubDomains`, preload, robots, permisos o autenticación solo para ganar puntos. Se mantiene la restricción de rastreo de `/api/`. Las nuevas cabeceras no convierten las respuestas privadas en públicas ni añaden caché.

## Pendientes que requieren otra decisión

- Las políticas legales ya están publicadas en `/legal/terminos`, `/legal/privacidad`, `/legal/cookies` y `/legal/reembolsos`, con el alcance y pendientes operativos de [la lista legal](legal-readiness-checklist.md). No confundir un fallo de detección del escáner con la ausencia de estos documentos.
- Revisión de fotografías, descripciones y precios definitivos del catálogo antes de promocionarlo activamente.
- Endurecimiento CSP de scripts/estilos con una estrategia compatible con streaming, autenticación y MUI; queda fuera de esta protección inicial.
- Search Console tiene su configuración inicial completada; rastreos y validación de Google siguen su propio ciclo. Ver [configuración y seguimiento](search-console-pendiente.md). Analytics es independiente y no se configura aquí.

### Revisión del escáner — 28 de octubre de 2026

Nuevo análisis en producción a las 22:24 UTC: **91/100, grado A**, metodología 2026-10-22 y 28 comprobaciones centrales. No equivale a probabilidad de recomendación por IA ni a un porcentaje de indexación.

| Deducción indicada           | Evidencia y tratamiento                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confianza, +4 posibles       | Dice no reconocer nosotros/contacto/privacidad. La web conserva nosotros y contacto en la landing por decisión de producto, y enlaza la privacidad española desde el pie. Se añaden relaciones HTML estándar `privacy-policy` y `terms-of-service` a los enlaces reales, sin duplicar páginas ni rellenar texto para superar un umbral.            |
| Rastreadores IA, +3 posibles | Penaliza la restricción de `/api/`, no el catálogo público. Se conserva: el catálogo HTML y el sitemap están disponibles sin abrir rutas internas. No se crean excepciones permisivas por agente.                                                                                                                                                  |
| Estado dinámico, +1 posible  | Detecta 14 widgets y pocos atributos ARIA en HTML estático. Los `details` nativos ya exponen su estado al navegador; no se les añade ARIA redundante. Sí se corrigen los disparadores personalizados del menú de sesión y del diálogo móvil: estado expandido, tipo de destino y relación con su contenido, con identificadores estables de React. |
| HSTS, +1 posible             | Ya reconoce `max-age=63072000`; pide `includeSubDomains`. Se mantiene el alcance actual hasta revisar todos los subdominios y servicios presentes/futuros. No se activa preload ni una política global solo por la nota.                                                                                                                           |

Los puntos son estimaciones del escáner, no una promesa de subida. Las mejoras locales de enlaces/menús requieren publicación y nuevo análisis antes de atribuirles una puntuación de producción. El objetivo es descubrimiento y uso reales, no retirar protecciones para obtener 100.

#### Verificación de esta revisión

- Suite completa: **159 suites y 934 pruebas aprobadas**; 13 suites y 64 pruebas omitidas por sus controles de entorno.
- Pruebas específicas: 30 aprobadas entre navegación/hidratación, enlaces del pie, landing, JSON-LD y cabeceras. Apertura/cierre de sesión con invitado y usuario, y relación del diálogo móvil comprobados por pruebas de componentes.
- Lint de los cuatro archivos de componentes/pruebas, `tsc --noEmit`, formato y `git diff --check` aprobados. No se ejecutó un nuevo build de producción en esta revisión.
- Chrome sobre desarrollo local `localhost:3001`: menú de sesión autenticada con estado falso → verdadero → falso y cierre con Escape; enlace de privacidad con relación estándar comprobado. Chrome registró una advertencia de hidratación por atributos inyectados por extensiones (`speedupyoutubeads` y `cz-shortcut-listen`), no por los identificadores del menú; no se ocultó la advertencia ni se alteraron esas extensiones.
- La nota **91/A** corresponde al nuevo análisis de producción previo a estos cambios locales. Publicación y análisis posterior siguen pendientes.

## Verificación

1. Ejecutar las regresiones de JSON-LD, variantes, vista previa, navegación e hidratación y la suite completa.
2. Probar un build compilado con `VERCEL_ENV=production`. Analizar el HTML sin ejecutar scripts y confirmar H1, secciones y datos públicos fuera de bloques ocultos.
3. Revisar una canónica y un JSON-LD por documento; comparar la oferta con la variante visible y confirmar que una combinación vacía no conserva el precio anterior.
4. Comprobar cabeceras globales, excepciones privadas y que `frame-ancestors 'self'`/`SAMEORIGIN` permiten la vista previa del mismo origen. No imponer `DENY` global.
5. En Chrome, verificar móvil/escritorio, imágenes, menú, filtros, variantes y carrito sin realizar pedidos, cambiar stock ni alterar usuarios reales.
6. Repetir el escáner sobre producción solo después de publicar. No presentar resultados locales como una nueva nota desplegada.

### Resultado local comprobado — 25 de octubre de 2026

- Suite completa: **153 suites y 913 pruebas aprobadas**; 12 suites de integración y 63 pruebas omitidas por sus controles de entorno. Build de producción y comprobaciones de formato/lint de los archivos cambiados aprobados.
- HTML compilado analizado sin ejecutar scripts: portada **20/20** encabezados legibles (antes 0/20), catálogo **30/30** (antes 3/30) y ficha Brisa **6/6** (antes 3/6). Un H1 y un contenido principal por documento público probado.
- Regresión SEO: sitemap con **38 URL únicas**, todas respondiendo 200; canónicas, filtros `noindex`, paginación, exclusiones privadas y API protegidas conservados.
- Chrome: portada de escritorio y móvil de 390 px, menú y filtros móviles, búsqueda Brisa, imágenes/galería, cambio Doble → Queen y sincronización de SKU/precio JSON-LD comprobados. Añadida y retirada una unidad en un carrito de origen local aislado, sin enviar WhatsApp ni crear pedidos.
- Cabeceras comprobadas por HTTP; cuenta e invitación conservan `no-referrer` y las API privadas devuelven 401 sin sesión.
- Vista previa privada abierta desde Publicación en Chrome: imágenes cargadas, compra deshabilitada, `noindex` y ningún JSON-LD comercial. Sin errores ni advertencias capturados en esa navegación.

Estas verificaciones son **locales, sobre el build compilado**, no una nueva puntuación de producción. Falta publicar y repetir IsAgentReady; no se garantiza un 100 ni posicionamiento por añadir estos datos.

## Referencias

- [Next.js: JSON-LD y escape de contenido](https://nextjs.org/docs/app/guides/json-ld).
- [Google: funciones de búsqueda con IA](https://developers.google.com/search/docs/appearance/ai-features).
- [Google: datos estructurados de productos](https://developers.google.com/search/docs/appearance/structured-data/product).
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
