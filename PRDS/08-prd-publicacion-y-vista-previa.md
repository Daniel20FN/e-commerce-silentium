# PRD 08 — Publicación guiada y vista previa

**Estado:** implementado, verificado y aceptado. No añade reglas nuevas de bloqueo. Depende de la [ficha del PRD 07](07-prd-ficha-producto-admin.md). Guía: [Publicación y preview](../docs/admin-publication-preview.md).

## Objetivo

Que el gestor sepa qué verá el cliente, por qué un producto no aparece o no es comprable y qué acción concreta lo resuelve, sin tener que interpretar estados dispersos.

## Flujo principal

1. Abrir Publicación en la ficha.
2. Revisar estado guardado, elegibilidad y resumen de preparación.
3. Corregir un problema desde su enlace a la sección correspondiente.
4. Previsualizar los datos guardados en móvil/escritorio y publicar mediante la operación existente.
5. Abrir la ficha real con «Ver en la tienda» cuando exista una ruta pública elegible.

## Requisitos

- Resumen que distingue: existencia como borrador, visibilidad pública y posibilidad de compra por variante. Producto activo no significa que todas sus variantes sean vendibles.
- Reutilizar las reglas del storefront y alertas administrativas. No implementar un validador distinto que contradiga la API pública.
- Clasificar resultados como bloqueo vigente, advertencia o recomendación. Cada problema relevante explica causa y remedio.
- Mostrar categorías activas/inactivas y su efecto real de navegación; no asegurar que una categoría inactiva siempre elimina la ficha pública sin comprobar la política vigente.
- Datos incompletos de fotos, SEO y costos pueden generar recomendaciones; no convertirlos en bloqueos nuevos de publicación por este PRD.
- Mostrar explícitamente stock cero, variante inactiva, variante por defecto no elegible y producto archivado/en papelera según las reglas existentes.

## Vista previa privada

- Solo para sesión administrativa autorizada, sin caché compartida ni indexación. No crear un enlace público que exponga borradores mediante un token sin una decisión adicional.
- Se basa en datos guardados. Si existen cambios pendientes, pedir guardar o informar claramente que no se incluyen; no afirmar que es una vista en vivo de cambios sin persistir.
- Reutilizar presentación y resolución de variantes/imágenes de la ficha pública, con proyección explícita de campos públicos. Nunca pasar costos o márgenes al componente público.
- Etiqueta visible de vista previa y controles de compra/WhatsApp deshabilitados; no mezclar un borrador privado con el carrito real ni generar enlaces externos de él.
- Muestras de ancho móvil/escritorio son ayudas de composición, no sustituyen QA en navegador real.
- «Ver en la tienda» no debe conducir a un 404 previsible ni confundirse con la vista previa de un borrador.

## Seguridad y casos borde

- Un usuario anónimo o sin permisos no puede leer el borrador, imágenes privadas administrativas, costos ni metadata interna por la ruta de preview.
- Publicación revalida en servidor el estado actual; el resumen de hace un minuto no autoriza saltarse cambios concurrentes.
- Variante retirada, categorías cambiadas por otra sesión y producto archivado durante la edición producen un resultado útil, no una publicación optimista falsa.
- Aclarar que retirar imágenes del catálogo no revoca sus URL públicas existentes; el preview no promete confidencialidad de los objetos ya publicados en Storage.

## Aceptación y pruebas

- [x] Cada bloqueo real tiene explicación y acceso para corregirlo; las recomendaciones no impiden guardar borradores.
- [x] Un producto activo sin stock no se presenta como comprable; las variantes elegibles coinciden con el storefront.
- [x] Preview de borrador funciona con sesión y es inaccesible de forma anónima, sin fuga a caché/indexación.
- [x] No se puede añadir un borrador al carrito ni iniciar una venta desde preview.
- [x] Cambios pendientes y datos guardados no se confunden; producto publicado abre su URL real.
- [x] Jest de política/proyección/autorización/caché, integración del catálogo cuando corresponda y Chrome con borrador, publicable, agotado y archivado.

Verificación local: 522 pruebas Jest aprobadas (14 integraciones opcionales omitidas en la ejecución normal), integración PostgreSQL de publicación ejecutada por separado, TypeScript y lint sin errores. Chrome: activación confirmada de QA, enlace público real, agotado visible/no comprable, fixture archivado/retirado de solo lectura, imagen cargada y preview de 390/1200 px; a 320 px no desborda la página. El producto QA de la ficha vuelve a quedar como borrador con stock 3. La muestra usa la ficha compartida y container queries, no un iframe; no se cambia la política de autorización para resolver problemas de incrustación.

## Fuera de alcance y continuación

SEO avanzado, programación de publicación, enlaces de preview compartibles y cambios en reglas comerciales del catálogo. Continúa con [PRD 09](09-prd-operaciones-rapidas-catalogo.md).
