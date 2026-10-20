# PRD 09 — Duplicación y operaciones rápidas de catálogo

**Estado:** alcance y reglas principales de copia aprobados. Dependencias: PRD 07–08; stock trazable se integra con PRD 10.

## Objetivo

Reducir el esfuerzo de preparar productos parecidos y actualizar variantes, sin duplicar existencias, SKU o errores de precio.

## A. Duplicar como borrador

1. Elegir Duplicar en un producto y revisar qué se copiará.
2. Confirmar la copia y abrir su nueva ficha en borrador.
3. Revisar nuevos SKU, precios, imágenes y categorías antes de publicar.

### Reglas confirmadas

- Copiar información, opciones, valores, combinaciones de variantes e imágenes generales/específicas con su orden y fallback.
- Crear identificadores y slug nuevos; nunca compartir identidades de producto, variante, opción o costo con el origen.
- Copia siempre en borrador, stock cero en todas las variantes y SKU nuevos únicos. No heredar la disponibilidad de venta del original.
- No copiar costos salvo selección explícita del gestor autorizado. Cuando se elija copiarlos, crear conceptos nuevos con sus ámbitos remapeados y sin historial ficticio.
- El origen y su stock nunca se modifican. Los cambios posteriores en cualquiera de las fichas no alteran la otra.

### Propuestas técnicas por validar

- SKU nuevos generados de forma única y editables antes de publicar; validar formato y colisiones en servidor. No clonar temporalmente el SKU original.
- Copiar solo registros activos, no papelera ni cargas pendientes/fallidas. Informar categorías no utilizables y abrir el borrador para resolverlas.
- Reutilizar objetos de imagen ya existentes mediante metadata independiente, sin volver a subir archivos. Confirmar D-05 del roadmap antes de fijar la estrategia de referencias/borrado.
- No heredar el destacado por defecto para evitar llenar la landing accidentalmente. Confirmar ese detalle en diseño.
- Escritura atómica e idempotente: doble clic/reintento no crea dos copias para una misma operación. Si falla un paso, no dejar una copia aparentemente completa.

## B. Tabla rápida de variantes

- Desde la ficha, editar precios y compare-at de varias variantes, con COP exactos, validación por fila y revisión antes de aplicar.
- Indicar valores anteriores/nuevos, filas modificadas y errores. Cancelar no persiste; fallar conserva la entrada.
- Guardado de precios de la selección atómico en la primera entrega propuesta: un conflicto invalida el lote sin modificaciones parciales ocultas. Releer/resolver sin borrar la entrada del usuario.
- No implementar aumentos porcentuales, promociones programadas o edición de todo el catálogo como parte del mínimo.

## C. Stock rápido: segunda parte, con PRD 10

- El gestor puede registrar un incremento, salida o conteo de varias variantes sin abrir cada editor.
- Cada fila requiere la información necesaria para el movimiento: motivo y cantidad; un conteo es una comparación con saldo/revisión, no una sustitución ciega.
- Hasta que exista el libro de movimientos, no presentar el editor rápido como inventario auditado. Al entrar PRD 10, eliminar caminos de stock que lo eludan.
- Revisar el lote y confirmar; definir tamaño máximo y contrato de atomicidad antes de implementar. La propuesta es lotes acotados y atómicos.

## Casos borde y aceptación

- [ ] Duplicar crea borrador, stock cero, slug/SKU nuevos y conserva el original exactamente igual.
- [ ] Costos desmarcados no se copian; con selección explícita quedan aislados y correctamente asociados.
- [ ] Galerías mantienen fallback/orden, pero ninguna edición de metadata se propaga a la otra copia.
- [ ] Doble clic, reintento, error de media o colisión no generan duplicados ni asociaciones cruzadas.
- [ ] Tabla conserva cambios ante errores y detecta revisiones concurrentes sin sobrescribirlas.
- [ ] Precios/stock no aceptan valores inválidos; stock rápido solo se acepta con PRD 10 y su trazabilidad.
- [ ] Jest de reglas/contratos/UI, integración transaccional y Chrome móvil/escritorio con copia y lote QA.

## Fuera de alcance

Importación/exportación CSV/Excel como entrega obligatoria, edición masiva de costos, variantes en papelera y sincronización con proveedores. CSV se diseña posteriormente con plantilla, validación previa, protección de fórmulas exportadas y reporte por fila.

Siguiente: [PRD 10 — Inventario](10-prd-inventario-movimientos.md).
