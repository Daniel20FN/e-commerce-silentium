# PRD 00 — Roadmap del sistema de catálogo y administración

## Propósito

Este documento define el orden oficial de implementación para el sistema de categorías, productos, variantes, imágenes, storefront y costos de producción. Cada PRD posterior entrega una fase funcional completa y usable, evitando construir piezas aisladas sin valor operativo.

## Problema

El proyecto todavía no cuenta con un dominio de catálogo. No existe un sistema estructurado para administrar categorías, productos con variantes, medios, precios, stock ni costos de producción. Sin una secuencia clara, el equipo corre el riesgo de construir pantallas antes de definir reglas críticas del negocio o de dejar dependencias funcionales incompletas.

## Objetivo

Entregar un sistema de catálogo usable por fases, donde cada fase desbloquee una capacidad real para el negocio y prepare la siguiente sin rehacer trabajo.

## Regla transversal de implementación

Cada fase de este roadmap debe entregar una capacidad funcional completa, incluyendo como mínimo:

- reglas de dominio
- persistencia de datos
- validaciones de negocio
- contratos de lectura y escritura
- UI operativa mínima para admin o storefront según corresponda

Este roadmap no organiza únicamente pantallas. Cada fase debe cerrar la pieza funcional de extremo a extremo para evitar deuda estructural.

## Resultado esperado por fases

1. **Fase 1 — Categorías administrativas**
   - El equipo puede crear, editar, buscar, ordenar, activar, desactivar, enviar a papelera y restaurar categorías jerárquicas.
   - El negocio obtiene la base de navegación comercial y clasificación de productos.

2. **Fase 2 — Productos, variantes y relaciones de catálogo**
   - El equipo puede crear productos, asignarlos a múltiples categorías y administrar variantes como unidad real de venta.
   - El negocio obtiene precios, stock y SKU a nivel variante.
   - Esta fase debe dejar preparado el dominio para costos futuros por producto y variante, aunque la gestión operativa de costos llegue después.

3. **Fase 3 — Imágenes y medios del catálogo**
   - El equipo puede cargar imágenes generales del producto y específicas por variante, con fallback automático a imágenes generales.
   - El negocio obtiene catálogo visual publicable y listo para storefront.

4. **Fase 4 — Storefront de categorías y productos**
   - Los clientes pueden navegar categorías, ver páginas públicas por slug, seleccionar atributos y resolver la variante correcta con precio y stock.
   - El negocio obtiene la experiencia de exploración y compra del catálogo.

5. **Fase 5 — Costos de producción y análisis base de margen**
   - El equipo puede registrar múltiples costos manuales por producto o variante y visualizar costo total y margen estimado.
   - El negocio obtiene visibilidad inicial sobre rentabilidad real.

## Orden de implementación y justificación

### 1. Categorías primero

Las categorías son la base de clasificación, navegación y organización operacional. Implementarlas primero evita definir productos sin estructura comercial ni jerarquía navegable.

### 2. Productos y variantes después

Una vez existe la taxonomía, se habilita el núcleo del negocio: productos y variantes con precio, stock y SKU. Esto permite cargar inventario comercial real, incluso antes de que existan medios o storefront completos.

Además, esta fase debe modelar correctamente la relación entre producto base y variante para que la futura capa de costos y márgenes no obligue a rehacer el dominio.

### 3. Medios como tercera fase

La gestión de imágenes depende de la existencia previa de productos y variantes. Esta fase enriquece el catálogo y lo deja listo para la experiencia visual pública.

Aunque esta fase no entrega todavía el storefront completo, sí debe dejar resueltos los contratos y comportamientos necesarios para consumo público consistente, especialmente la lógica entre imágenes generales del producto e imágenes específicas por variante.

### 4. Storefront cuando el catálogo ya existe

El storefront debe consumir un dominio estable. Hacerlo antes obligaría a redefinir contratos, estados y reglas de selección de variantes.

### 5. Costos y márgenes al final del primer ciclo

El costo operativo depende de tener productos y variantes consolidados. Esta fase agrega inteligencia comercial sin bloquear la publicación del catálogo.

## Dependencias entre PRDs

- PRD 01 no depende de ningún PRD previo del catálogo.
- PRD 02 depende de PRD 01.
- PRD 03 depende de PRD 02.
- PRD 04 depende de PRD 01, PRD 02 y PRD 03.
- PRD 05 depende de PRD 02.

## Principios del dominio

- Las categorías son jerárquicas y tienen página pública propia.
- Un producto puede pertenecer a múltiples categorías.
- El producto es una entidad editorial/comercial base.
- La variante es la unidad real de venta.
- El precio, el stock y el SKU viven en la variante.
- Una variante puede estar inactiva aunque el producto siga activo.
- El borrado funcional es lógico; la recuperación futura desde papelera es obligatoria.
- Las imágenes de variante heredan las del producto si no existen imágenes específicas.
- Los costos se cargan manualmente por concepto y deben permitir cálculo posterior de margen real.

## Fuera de alcance de este roadmap inicial

- Historial de costos versionado.
- Movimientos de inventario y kardex.
- Gestión de proveedores.
- Importación masiva por CSV/Excel.
- Promociones complejas, bundles o reglas avanzadas de pricing.
- Publicación multimoneda o multilenguaje.

## Riesgos

- Diseñar variantes de forma demasiado rígida y bloquear atributos futuros.
- Diseñar mal la resolución de variantes y permitir combinaciones inválidas, precios incorrectos o stock inconsistente entre admin y storefront.
- Cargar medios sin reglas claras de fallback y generar inconsistencias visuales.
- Implementar listados sin filtros server-side reales y degradar la operación del admin.
- Mezclar estados de producto con estados de variante y volver confuso el catálogo.

## Criterios de aceptación del roadmap

- Existe un PRD por fase funcional del catálogo.
- Cada PRD tiene dependencias y alcance explícitos.
- El orden de implementación evita rehacer fases previas.
- Cada fase entrega valor usable por negocio o por operación interna.
