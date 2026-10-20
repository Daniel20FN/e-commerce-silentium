# PRD 07 — Ficha unificada de producto

**Estado:** implementado, verificado y aceptado. Primera entrega del [roadmap operativo](00-roadmap-operacion-tienda.md).

## Problema y objetivo

El gestor trabaja hoy con diálogos separados para información, variantes, imágenes y costos. El formulario principal también puede cerrarse sin una protección equivalente a la del editor de costos. El objetivo es un espacio estable para preparar un producto sin perder contexto ni trabajo.

## Flujo principal

1. Desde Productos, crear o abrir un producto.
2. Trabajar en Información, Variantes y precios, Imágenes, Costos y Publicación sin abandonar su contexto.
3. Ver qué está guardado, qué está pendiente y qué error requiere atención.
4. Guardar por sección y continuar; el acceso de publicación enlaza inicialmente con el estado actual y será ampliado por PRD 08.

## Alcance

- Ficha administrativa con URL estable por producto y pestaña/sección identificable. El listado conserva filtros, orden y página al regresar.
- Alta inicial en borrador con los mínimos que exige el dominio vigente; crear el identificador antes de subir medios asociados a él.
- Reutilizar el editor de variantes y su generador, el uploader/galerías y la gestión privada de costos. Adaptar su contenedor, no reescribir sus reglas.
- Cabecera con nombre, estado y acciones coherentes con permisos, papelera y archivado.
- Guardado explícito por sección. Ningún botón promete guardar todas las secciones si no existe una operación que lo garantice.

## Reglas de trabajo pendiente

- Cambiar pestaña, cerrar, cancelar o abandonar la ficha advierte si se perderán cambios. Ofrecer seguir editando o descartar; guardar solo cuando sea una acción realmente disponible.
- Cubrir navegación interna y el aviso nativo de cierre/recarga del navegador dentro de sus limitaciones, sin prometer recuperación automática tras cerrar la pestaña.
- Un error de validación, red o conflicto conserva la entrada del gestor. No limpiar el formulario por una respuesta fallida.
- Mientras haya una subida, mostrar progreso y evitar abandonar silenciosamente metadata pendiente; preservar la recuperación ya existente del uploader.
- Al guardar una sección se actualizan sus datos y las dependencias pertinentes, sin borrar cambios pendientes de otra.
- Sin edición de productos archivados/en papelera fuera de las operaciones expresamente permitidas por los servicios actuales.

## Experiencia

- Admin compacto y funcional según `DESIGN.md`. Navegación de secciones usable con teclado y a 320/390 px, sin desbordar la página.
- Estado de carga, producto inexistente, permiso insuficiente y fallo de guardado distinguibles.
- Foco en el primer error útil y mensajes concretos del diccionario. Mantener colores, precios COP y terminología consistentes.
- Propuesta de URL: `/admin/productos/[productId]`; decidir su diseño exacto antes de implementar. La ruta privada nunca se reutiliza como enlace público de WhatsApp.

## Fuera de alcance

Nuevo CRUD, cambio de esquema de catálogo, guardado automático, vista previa privada, duplicación, inventario histórico y pedidos. Los cuatro últimos tienen PRDs posteriores.

## Aceptación y verificación

- [x] Crear borrador → variantes → imágenes → costos puede completarse desde una sola ficha con los servicios existentes.
- [x] Volver al listado conserva el contexto; recargar abre una ficha válida, no un modal huérfano.
- [x] Cambiar de sección o salir con datos pendientes nunca los descarta sin aviso explícito.
- [x] Guardado fallido y conflicto conservan la entrada; la recarga no sobrescribe cambios sin decisión.
- [x] Generador, imágenes por variante/fallback, costos y permisos conservan sus regresiones actuales.
- [x] Jest para navegación/dirty state/errores, pruebas de contratos si cambian y Chrome móvil/escritorio con una carga completa de producto QA.

## Evidencia local — 20 de octubre de 2026

- Jest completo: 493 pruebas aprobadas; 13 integraciones opcionales omitidas. Regresión posterior del formulario/listado: 17 aprobadas.
- TypeScript, lint (sin errores; advertencia existente de coverage) y build de producción aprobados.
- Chrome de escritorio y 320/390 px: borrador QA → variante simple → imagen subida con el uploader existente → costo y margen COP; cambios pendientes, bloqueo durante subida y conflicto de producto/variante entre pestañas.
- Imagen pública y fallback por variante cargan correctamente. Endpoints de producto, variantes y costos responden 401 sin sesión.
- Borrador de inspección: QA PRD07 Ficha 20261020, sin publicar. No se modificó el producto Aurora.
- Los recorridos nativos del historial solo se interceptan cuando el navegador permite cancelar el evento; no se promete recuperación tras cerrar ni protección universal de Atrás/Adelante. Ver [guía de uso y límites](../docs/admin-product-workspace.md).

## Dependencias y siguiente entrega

Depende de PRD 01–05. No requiere decidir cancelaciones de pedidos. Continúa con [PRD 08](08-prd-publicacion-y-vista-previa.md).
