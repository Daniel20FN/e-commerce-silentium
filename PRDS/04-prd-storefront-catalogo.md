# PRD 04 — Storefront de categorías y detalle de producto

## Problema

Aunque el admin gestione correctamente el catálogo, el negocio necesita que los clientes puedan descubrir categorías, navegar productos, entrar al detalle y seleccionar una variante concreta con precio, descuento, imágenes y disponibilidad real. Sin esto, el catálogo sigue siendo interno y no genera valor comercial directo.

## Objetivo

Entregar la experiencia pública mínima viable del catálogo, incluyendo páginas por categoría y por producto, navegación por slug, resolución de variante basada en atributos y visualización consistente de imágenes, stock y precio.

## Usuarios y contexto

- **Clientes storefront**: exploran, comparan y seleccionan productos.
- **Equipo comercial**: depende de que el catálogo publicado sea consistente con el admin.

## Valor de negocio

- Convierte el catálogo administrativo en experiencia de compra navegable.
- Mejora descubrimiento de productos por categoría.
- Permite mostrar descuentos y disponibilidad real por variante.
- Prepara el terreno para carrito y checkout futuros.

## Alcance

### Incluye

- Página pública de categoría por slug.
- Página pública de producto por slug.
- Listado público de productos por categoría.
- Visualización de producto base y variantes elegibles.
- Selección de atributos por parte del cliente.
- Resolución de variante en función de la selección.
- Visualización de precio, compare-at price y stock de la variante seleccionada.
- Visualización de imágenes con fallback desde producto hacia variante.
- Respeto de estados activos/inactivos y disponibilidad real.

### No incluye

- Carrito y checkout.
- Reviews.
- Recomendaciones personalizadas.
- Búsqueda global avanzada del storefront.

## Requisitos funcionales de categoría pública

1. Cada categoría activa puede tener una página pública accesible por slug.
2. La página de categoría muestra información principal de la categoría y su listado de productos elegibles.
3. Los productos mostrados deben respetar estados activos y reglas de publicación.
4. El orden de categorías y productos debe seguir la lógica comercial definida para storefront.

## Requisitos funcionales de producto público

5. Cada producto activo puede tener una página pública accesible por slug.
6. La página de producto debe mostrar nombre, descripciones, categorías relevantes e información visual.
7. El cliente debe poder seleccionar atributos, como tamaño, color o material.
8. La selección de atributos debe resolver la variante correspondiente cuando exista una combinación válida.
9. Una vez resuelta la variante, se deben mostrar su precio, compare-at price, stock y disponibilidad.
10. Si la variante tiene imágenes propias, deben mostrarse primero.
11. Si la variante no tiene imágenes propias, deben mostrarse las del producto.
12. Las variantes inactivas no deben poder seleccionarse como opción comprable.
13. Una variante sin stock debe comunicar claramente su indisponibilidad.
14. Debe existir una variante inicial por defecto o una lógica clara de estado inicial antes de completar la selección.

## Reglas de negocio

- Solo categorías activas deben ser navegables públicamente.
- Solo productos activos y no eliminados deben considerarse publicables.
- Las variantes inactivas o en papelera no deben estar disponibles para compra.
- El compare-at price solo debe mostrarse cuando represente un descuento real.
- La experiencia de selección no debe inducir al cliente a elegir combinaciones inexistentes sin feedback claro.

## Casos borde

- Producto activo sin variantes activas.
- Variante activa con stock cero.
- Combinación parcial de atributos que no resuelve una variante válida.
- Categoría activa sin productos visibles.
- Producto con imágenes generales pero sin imágenes por variante.
- Slug público inexistente o no elegible.

## Requisitos de experiencia de usuario

- La página de categoría debe priorizar descubrimiento y escaneo rápido.
- La página de producto debe dejar muy claro qué parte cambia al seleccionar una variante.
- La resolución de precio y disponibilidad debe sentirse inmediata y entendible.
- El cliente debe percibir siempre una imagen principal coherente.
- No deben mostrarse opciones no elegibles como si fueran comprables.

## Criterios de aceptación

- Dada una categoría activa con slug válido, cuando un cliente accede a su URL, entonces ve la página pública de categoría con productos elegibles.
- Dado un producto activo con slug válido, cuando un cliente entra a su detalle, entonces ve la información general del producto y sus opciones de selección.
- Dada una combinación válida de atributos, cuando el cliente la selecciona, entonces el sistema resuelve la variante correcta y actualiza precio, descuento, stock e imágenes.
- Dada una variante sin imágenes propias, cuando el cliente la visualiza, entonces el sistema utiliza las imágenes generales del producto.
- Dada una variante inactiva o sin stock, cuando el cliente intenta seleccionarla, entonces el sistema comunica claramente que no está disponible.

## Métricas de éxito

- Mayor tasa de navegación desde categorías hacia detalle de producto.
- Menor confusión durante la selección de variante.
- Baja incidencia de productos visibles con información inconsistente de precio o stock.

## Dependencias

- PRD 01, PRD 02 y PRD 03 completados.
- Navegación storefront existente preparada para incorporar nuevas rutas públicas.

## Riesgos

- Resolver mal variantes y mostrar precio o stock incorrecto.
- Presentar atributos de manera confusa y degradar conversión.
- Exponer contenido no listo por no respetar estados del catálogo.

## Open questions

- Si una categoría sin productos debe ocultarse o mostrar empty state público.
- Qué priorización tendrá la categoría principal del producto en breadcrumbs o navegación.
