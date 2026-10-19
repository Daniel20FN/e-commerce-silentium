# Información pública en una sola landing

Nosotros, cómo comprar, ayuda y contacto viven en la portada. La navegación principal salta a secciones; el catálogo completo, las ofertas, el detalle del producto y el carrito conservan sus rutas para explorar y comprar.

## Recorrido

| Destino              | Fragmento        |
| -------------------- | ---------------- |
| Presentación         | `/#inicio`       |
| Colecciones          | `/#colecciones`  |
| Productos destacados | `/#productos`    |
| Cómo comprar         | `/#como-comprar` |
| Nosotros             | `/#nosotros`     |
| Ayuda                | `/#ayuda`        |
| Contacto             | `/#contacto`     |

El footer enlaza también a preguntas concretas: `#envios`, `#pagos`, `#cambios` y `#datos-navegador`. Al abrir un enlace directo, se despliega su respuesta y el foco pasa al resumen. Las antiguas URLs `/nosotros` y `/contacto` responden **308** hacia sus fragmentos en la landing, sin crear páginas informativas adicionales.

## Interacción y accesibilidad

- Preguntas con HTML nativo `details/summary`: abrir, cerrar y usar teclado no exige una librería de acordeones. Un pequeño componente cliente añade apertura por fragmento y limpieza de sus listeners.
- Anclas con margen de desplazamiento para la cabecera fija; menú móvil que se cierra al elegir sección; salto al contenido y jerarquía de encabezados.
- Desplazamiento suave por CSS, desactivado con `prefers-reduced-motion`.
- Nosotros y Contacto permanecen disponibles en la misma portada; desde catálogo se vuelve al fragmento de la portada.
- WhatsApp y teléfono usan el contacto aprobado de `src/values/sales_contact.ts`. No hay formulario que finja enviar o guardar datos.

## Contenido real y límites

- Textos en `src/dictionary/es.json`, bajo `landing`. Catálogo, precios y fotos siguen procediendo de los servicios públicos existentes.
- No se inventan antigüedad, certificaciones, reseñas, cobertura, entrega gratis, porcentajes de descuento ni plazos comerciales.
- Se retiran de la composición de la portada los módulos de testimonios de ejemplo y newsletter sin persistencia. Sus archivos históricos no se invocan ni se incluyen como módulos cliente de esta portada.
- Se eliminan los enlaces públicos a cuenta, pedidos y favoritos que no tenían páginas. Inicio/registro, cierre de sesión, carrito y acceso administrativo real siguen disponibles.
- No hay iconos sociales vacíos ni enlaces `#` que finjan políticas. La ayuda describe el flujo actual; **no sustituye los textos legales y políticas comerciales que debe aportar el negocio antes del lanzamiento**.

## Rendimiento

- El texto y los enlaces de presentación, guía de compra, Nosotros, Contacto y footer se componen en servidor. El hero es una sola imagen optimizada sin selector ni estado cliente; `LandingShell` aplica variables de tema y `CategoryEditorialImage` recupera imágenes antiguas inaccesibles.
- Solo se envían al navbar las etiquetas que utiliza, en lugar del diccionario completo de formularios administrativos. Las preguntas reciben únicamente su lista de textos.
- Sin dependencias nuevas, carruseles, mapas, vídeos ni widgets externos. El navbar utiliza el listener de scroll de MUI para cambiar a fondo opaco; las animaciones visuales usan CSS.
- No se añaden consultas de catálogo. El hero aprobado usa una imagen ilustrativa local WebP (228.656 bytes), separada de las fotografías reales del catálogo, con prioridad y tamaños responsive. Se retiraron el selector «Elige tu ambiente», la imagen Arena y su código/estilos no utilizados.
- La imagen antigua de una categoría puede apuntar a un bucket privado. Se conserva la carga directa original; si falla, se muestra un ambiente local con alt y aviso de imagen ilustrativa, sin cambiar permisos de Storage ni inventar una fotografía de producto.

### Medición reproducible

Comparar los archivos únicos de `entryJSFiles` de `src/app/page` en `.next/server/app/page_client-reference-manifest.js`, unidos a `rootMainFiles` de `.next/build-manifest.json`. Sumar tamaños originales y gzip de esos archivos de `.next/`, con la misma configuración de build. Es una comparación de JavaScript emitido, **no** una medición de toda la transferencia, las fotos, el rendimiento de red ni una puntuación Lighthouse.

Base anterior (PR #8): 19 archivos, **1.133.700 bytes** originales, **333.118 bytes** gzip. La portada anterior incluía hero, beneficios, newsletter y testimonios como módulos cliente.

Medición del ciclo anterior, antes del rediseño inmersivo: 18 archivos, **1.071.121 bytes** originales, **315.552 bytes** gzip. No atribuir esta cifra al rediseño actual sin volver a medir.

Medición histórica del rediseño inicial con selector: 18 archivos, **1.076.325 bytes** originales, **317.076 bytes** gzip. La versión actual elimina ese control y su isla cliente; no atribuir estas cifras históricas al estado actual. Las fotografías se contabilizan aparte.

## Dirección aprobada: Refugio inmersivo

Hero fotográfico de cortina, pared azul profunda y cama cálida, con texto y controles semánticos. El estilo continúa en categorías editoriales, producto destacado de datos reales, guía sin tarjetas decorativas, bloque de marca azul con foto, FAQ nativa, contacto cálido y footer azul. Solo la portada recibe esta composición; las rutas comerciales y el admin no cambian de estilo.

La entrada fotográfica termina en 1,2 segundos. Hay feedback de enlaces y profundidad acotada en la foto de marca mediante scroll timeline cuando el navegador lo soporta. `prefers-reduced-motion` conserva el estado final sin animación espacial. No hay secuestro del scroll ni bucles constantes.

Las imágenes de ambiente se generaron con la herramienta integrada a partir del comp aprobado. Su origen y prompts están en `public/images/landing/provenance.json`; no son pruebas de materiales, fabricación ni productos concretos. Los comps y estados de las skills son locales e ignorados por Git.

## Verificación

Estado para commit, sin selector de ambiente: **453 tests aprobados y 13 opcionales omitidos**; TypeScript, lint (sin errores, avisos preexistentes) y build de producción aprobados. Regresión: el hero contiene una sola imagen, ningún botón selector y ningún texto «Elige tu ambiente». El resto del diseño y las animaciones de entrada se mantienen.

Verificación del rediseño inicial con selector: **455 tests aprobados, 13 opcionales omitidos**; TypeScript, lint y build correctos. Se conserva como registro histórico; la retirada del selector se vuelve a validar antes del commit.

Auditoría de fuente: detector Impeccable sin hallazgos y Taste lint sin fallos. Excepciones explícitas: scrims neutros sobre fotografías para contraste y reglas `box-shadow: none` que quitan elevación de MUI. La inspección visual se realiza con CUA en Chrome; no se ejecuta el inspector automatizado de Taste porque el entorno exige ese canal para control del navegador. El fallback de movimiento reducido se revisa en CSS; no se afirma haber emulado esa preferencia en Chrome.

- Jest: composición, enlaces y destinos, CTA WhatsApp/teléfono, FAQ nativa, fragmento inicial y cambios de fragmento, recuperación de fragmentos malformados, menú móvil, sesión/admin y proyección del diccionario.
- `npx tsc --noEmit --incremental false`, `npm run lint` y `npm run build`.
- Chrome móvil y escritorio: desplazamiento real, margen de cabecera, apertura de FAQ desde footer/teclado, navegación desde catálogo y redirects antiguos; sin mensajes ni llamadas reales.
- La comprobación con Next real es necesaria: un test de render en Jest no detecta funciones pasadas por error a través de la frontera servidor/cliente. El footer usa anclas MUI nativas para evitar ese problema.

Resultado del ciclo anterior, antes del rediseño (19 de octubre de 2026): **450 tests aprobados y 13 pruebas opcionales omitidas**; TypeScript y build de producción aprobados; lint sin errores, con avisos preexistentes de configuración/coverage. Chrome contra `next start` confirmó las fotos cargadas, FAQ por enlace y teclado, regreso desde el detalle a `/#nosotros`, menú móvil y contacto sin desbordamiento horizontal (375 px de contenido y 375 px de ancho desplazable). Las capturas de escritorio y móvil quedan fuera del repositorio. No se enviaron mensajes, realizaron llamadas ni modificaron datos de catálogo.

## Brand alignment (2026-10-20)

The approved layout, room plate, real catalog photography, same-page links and guest WhatsApp cart remain unchanged. Global brand primitives now follow `docs/BRIEF.pdf`: ivory, beige, celeste and chocolate. Semantic surfaces use accessible tone derivatives; dark mode is retained with warm chocolate backgrounds, ivory text and celeste actions.

Official PDF vector outlines supply the wordmark (navbar and mobile drawer), full signature (footer), and crescent/stars favicon, SVG icon and Apple touch icon. Asset origins and source digest are recorded in `public/brand/provenance.json`. Typography uses approved, locally served Cormorant Garamond/Manrope alternatives with retained OFL notices; no runtime font CDN requests or new application dependencies.

Verification includes light/dark palette and action contrast tests, accessible logo variants, mobile navigation, all existing shopping tests, TypeScript/lint, production build, and Chrome responsive visual checks. The existing illustrative hero and legacy category fallback stay labeled as before; no new product claims or imagery are introduced.

### Dark-mode color balance

After visual feedback that the first dark adaptation was too brown, dark surfaces now use deep blue, blue-gray panels and a stronger blue story field. Footer and scrolled navigation follow the same blue system; celeste actions and ivory text remain. Light mode, original logo colors and room photography are unchanged. Theme tests cover body/action contrast plus both text colors on the raised blue story field.

### Official brand copy

The hero now uses the brief headline “Descanso y confort” and the exact slogan “Convertimos tu hogar en un reflejo de quién eres.” The about introduction uses “No vendemos productos, creamos experiencias que transforman espacios.” The existing “para mi hogar” lettering remains in the original footer signature. These copy changes are dictionary-backed and do not replace factual shopping instructions or add new commercial promises.

### Clarified dark-mode balance

The blue-led dark revision was a misinterpretation of feedback. Brown remains the principal canvas, panel, header and footer color. Official celeste is used deliberately on actions, a single brand-story field, active FAQ text and footer signature; chocolate text on celeste retains readable contrast. This clarification takes precedence over the preceding blue-led revision. Light mode and the official brief wording remain unchanged.

### Final hero copy hierarchy

Explicitly approved: “Convertimos tu hogar en un reflejo de quién eres.” is the main H1, replacing “Descanso y confort”; “No vendemos productos, creamos experiencias que transforman espacios.” is the supporting hero paragraph. The about section returns to its concrete catalog introduction to avoid repeating the statement. The heading wraps naturally rather than splitting an artificial accent line; responsive size/measure are tuned for the full approved text.

## Mobile hero: Entre telas

Approved portrait concept implemented below 600px; tablet/desktop photographic composition and semantic copy preserved. Clean generated room plate and a transparent foreground curtain are independent assets; all text, logos and controls remain HTML/SVG. Sources and generation purpose are recorded in public/images/landing/provenance.json.

Room 480/800w WebPs plus curtain 1x/2x WebPs total 87,200 or 196,280 bytes. Native picture selects the portrait only on phones. Eager/high fetch priority deliberately avoids Next Image priority, which would preload the desktop fallback regardless of picture selection. No extra client boundary, animation library, video, observer or scroll handler.

Finite 1150ms curtain entrance and bounded CSS view-timeline depth have a visible static fallback; existing reduced-motion override disables every animation/transition. The curtain is offset 24px right after 320px visual QA to keep bright fabric away from copy. Official three-line slogan, readable 16px support and a 52px primary CTA take precedence over fitting the entire scene into one viewport.

Validation: full Jest 462 passed / 13 optional integration tests skipped; art-direction regression verifies one picture/source/image, eager/high loading and one h1. Taste source lint: 0 failures/warnings; Impeccable detector: no findings. Chrome visual QA at 320x568, 390x844 and 430x932 confirmed portrait selection and no horizontal overflow, with the primary CTA above the fold. Production build and standalone TypeScript check passed; repository lint has no errors (one warning in generated coverage output, plus the pre-existing ignore-file notice). Production Chrome smoke confirmed desktop fallback and hidden curtain at 1440px, tablet fallback at 600px, working product anchor and both theme states. CSS breakpoint uses 599.95px to cover fractional phone widths, matching the MUI breakpoint convention. Reduced-motion behavior is enforced by CSS; no browser preference emulation was available in this control session.
