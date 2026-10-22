# Buscar y filtrar el catálogo

Catálogo, categorías y ofertas comparten búsqueda, filtros y ordenación.
En escritorio se muestran en una barra lateral; en móvil, un buscador visible y
un panel con cierre, foco contenido y botón explícito para aplicar.

## Comportamiento

- Búsqueda literal por nombre, sin distinguir mayúsculas ni tildes.
- Categoría y subcategoría: una página de categoría solo permite su propia rama.
- Precio inicial en COP: mínimo de las variantes activas con stock; si no hay
  ninguna disponible, mínimo de las variantes activas. Coincide con «Desde».
- Disponibilidad: al menos una variante activa con stock.
- Ofertas: al menos una variante activa con precio anterior superior al actual.
- Orden: destacados, precio ascendente/descendente o nombre A–Z/Z–A; siempre con
  desempate estable por identificador.

## Estado y consultas

Los formularios GET guardan `q`, `categoria`, `min`, `max`, `disponibles`,
`ofertas` y `orden` en la URL. Aplicar búsqueda, filtros u orden vuelve a la
primera página; la paginación conserva todo. «Limpiar filtros» mantiene la ruta
de la categoría, pero elimina los parámetros. Volver del producto recupera la URL.

El analizador limita búsqueda y valores monetarios, descarta parámetros repetidos
y normaliza intervalos invertidos. No se filtran solamente las tarjetas visibles.

Las consultas avanzadas usan SQL parametrizado: agregación lateral de variantes,
elegibilidad pública, filtros, recuento y ordenación antes del límite de 24. Después
se cargan únicamente las tarjetas de esa página mediante la proyección pública
existente. La consulta sin filtros conserva el camino ORM anterior. No se envían
costos, SKU ni datos privados al navegador para filtrar.

La elegibilidad SQL debe seguir alineada con `publicProductWhere`: producto activo,
sin archivo ni borrado, al menos una variante activa no eliminada y pertenencia a
una categoría pública cuyos ancestros sean visibles. Revisar ambos caminos al
cambiar las reglas de publicación.

## Verificación

- `catalog_filters.test.ts`: normalización, límites, URL y paginación.
- `catalog_filters.test.tsx`: panel móvil, formularios, conservación y vacío.
- `catalog_filter_query.integration.test.ts`: PostgreSQL, precios, rango,
  disponibilidad/ofertas y búsqueda literal. Reutiliza `STOREFRONT_INTEGRATION=1`
  con `.env.development`; **solo lee**, no crea ni modifica datos.
- Chrome: probar escritorio/móvil, aplicar y limpiar, paginar, abrir un producto
  y volver, categoría/subcategoría y filtros sin resultados.
