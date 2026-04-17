# PRD 02 — Gestión administrativa de productos y variantes

## Problema

El negocio necesita administrar productos reales de e-commerce con múltiples categorías, variantes configurables, precios, descuentos, stock, SKU y estados comerciales. Hoy no existe una sección administrativa que permita cargar ni operar el catálogo de venta.

## Objetivo

Permitir que el equipo admin gestione productos como entidad base del catálogo y variantes como unidad real de venta, con listados server-side, formularios de alta/edición, acciones masivas, papelera lógica y reglas claras de activación.

## Usuarios y contexto

- **Super admin / admin**: crean y administran el catálogo.
- **Support**: consulta y realiza ajustes operativos según permisos.
- **Clientes storefront**: consumen productos activos y variantes elegibles.

## Valor de negocio

- Permite publicar un catálogo comercial real.
- Soporta precio, compare-at price y stock por variante.
- Evita modelar como único producto lo que en la práctica son unidades vendibles distintas.
- Prepara el storefront para selección de atributos y resolución de variante.

## Alcance

### Incluye

- Sección administrativa de productos.
- Listado principal con búsqueda, filtros, orden y paginación server-side.
- Creación y edición de productos.
- Asociación de productos a múltiples categorías.
- Definición de opciones configurables por producto.
- Creación y edición de variantes.
- Precio, compare-at price, stock, SKU y estado por variante.
- Destacado de producto.
- Estado de producto (`draft`, `active`, `archived`).
- Activación/inactivación de variantes.
- Borrado lógico y restauración de productos y variantes.
- Acciones masivas sobre productos.

### No incluye

- Promociones automáticas complejas.
- Historial de cambios de stock.
- Cálculos financieros avanzados.
- Importación masiva.

## Requisitos funcionales del producto

1. El admin puede ver un listado de productos con datos operativos suficientes para tomar decisiones rápidas.
2. El listado debe soportar búsqueda server-side por nombre, slug y SKU de variantes.
3. El listado debe soportar filtros server-side por estado, categoría, destacado, stock, descuento y papelera.
4. El listado debe soportar orden y paginación server-side.
5. El admin puede crear un producto con nombre, slug, descripciones, estado, SEO y destacado.
6. El admin puede asociar un producto a múltiples categorías.
7. El admin puede definir cuál categoría es principal si el negocio lo requiere.
8. El admin puede editar un producto sin perder las relaciones existentes salvo que las cambie explícitamente.
9. El admin puede archivar un producto sin borrarlo.
10. El admin puede mover un producto a papelera y restaurarlo más adelante.

## Requisitos funcionales de variantes

11. El admin puede definir opciones configurables por producto, como tamaño, color o material.
12. El admin puede registrar valores posibles para cada opción.
13. El admin puede crear una variante con combinación de valores válida.
14. Cada variante debe tener SKU propio.
15. Cada variante debe tener precio propio.
16. Cada variante puede tener compare-at price para soportar descuento visible.
17. Cada variante debe tener stock propio.
18. Cada variante puede activarse o inactivarse de forma independiente del producto.
19. El admin puede definir una variante por defecto para storefront.
20. El admin puede reordenar variantes.
21. El sistema debe impedir duplicar combinaciones de atributos dentro del mismo producto.
22. El sistema debe impedir duplicar SKU si la política comercial lo define como único global.
23. Una variante inactiva no debe ser elegible para compra pública.
24. Una variante en papelera no debe estar disponible para selección ni operación estándar.

## Datos mínimos del producto

- Nombre
- Slug
- Descripción corta
- Descripción completa
- Marca opcional
- Estado
- Destacado
- SEO title
- SEO description
- Categorías asociadas
- Borrado lógico
- Fechas de creación y actualización

## Datos mínimos de variante

- Nombre o etiqueta interna
- SKU
- Precio
- Compare-at price opcional
- Stock
- Estado activo/inactivo
- Variante por defecto
- Orden manual
- Peso opcional
- Dimensiones opcionales
- Borrado lógico

## Reglas de negocio

- Un producto puede pertenecer a múltiples categorías.
- Un producto puede existir en draft aunque no tenga todas sus variantes publicables listas.
- Un producto activo no implica que todas sus variantes estén activas.
- La variante es la unidad real de precio, stock y compra.
- El compare-at price solo tiene sentido si es mayor al precio vigente.
- Un producto sin variantes activas no debe quedar disponible para compra, aunque puede mantenerse visible según reglas comerciales posteriores.
- El slug del producto debe ser único.
- La combinación de valores de opción debe identificar una variante de manera unívoca dentro del producto.

## Casos borde

- Producto sin categorías.
- Producto activo sin variantes activas.
- Variante con stock cero pero activa.
- Variante inactiva marcada como predeterminada.
- Cambio de opciones después de haber creado variantes.
- Reutilización accidental del mismo SKU.
- Producto en papelera con variantes activas.

## Requisitos de experiencia de usuario

- El flujo de alta debe separar claramente producto base de variantes.
- El admin debe entender rápido qué datos pertenecen al producto y cuáles a la variante.
- La tabla debe hacer visible el estado general del producto y su disponibilidad real.
- Las acciones masivas deben ser seguras y previsibles.

## Criterios de aceptación

- Dado un admin, cuando crea un producto válido, entonces el producto queda registrado y visible en el listado.
- Dado un producto, cuando el admin lo asocia a varias categorías, entonces esas relaciones se guardan y son visibles al reabrir la edición.
- Dado un producto con opciones configurables, cuando el admin crea una variante con una combinación válida, entonces la variante queda disponible para operación interna.
- Dado un SKU duplicado prohibido, cuando el admin intenta guardar la variante, entonces el sistema rechaza la operación y comunica el motivo.
- Dado un compare-at price menor o igual al precio, cuando el admin intenta guardar la variante, entonces el sistema informa la inconsistencia o ignora el descuento según la regla definida.
- Dado un producto en papelera, cuando el admin lo restaura, entonces recupera su información principal y sus variantes relacionadas.
- Dado varias filas seleccionadas, cuando el admin ejecuta una acción masiva válida, entonces la operación se aplica a todos los productos elegibles.

## Métricas de éxito

- Tiempo de carga de un producto con variantes menor que el proceso manual previo.
- Disminución de errores de precio y stock publicados.
- Capacidad de encontrar un producto por nombre, slug o SKU en pocos segundos.

## Dependencias

- PRD 01 completado o al menos categorías operables.
- Reglas de permisos administrativas disponibles.

## Riesgos

- Mezclar conceptos de producto y variante y volver confusa la operación.
- Diseñar atributos demasiado rígidos y bloquear la evolución del catálogo.
- Habilitar productos activos sin disponibilidad vendible real.

## Open questions

- Si el SKU será único global o único por producto.
- Cómo se mostrará un producto activo sin variantes activas en storefront.
