# Aprender a gestionar Silentium desde el administrador

Abre **Guía de uso** en el menú administrativo, en `/admin/guia`.
Empieza por **Tu primer producto, de principio a fin** o busca una tarea.
La guía es de consulta: no crea ejemplos en la base de datos ni ejecuta acciones.

## Acceso y navegación

- Requiere la misma autorización administrativa que el resto del panel.
- El buscador consulta títulos, pasos, reglas, avisos y ejemplos. No distingue
  mayúsculas ni tildes; todas las palabras deben aparecer en el tema.
- La URL conserva `q` para búsqueda o `tema` para un artículo. Los parámetros
  repetidos se ignoran y las longitudes se acotan.
- Escritorio: índice lateral. Móvil: selector de tema y botón **Leer guía**.
- El icono de ayuda del encabezado abre el tema de la sección actual en otra
  pestaña, sin reemplazar un formulario que pudiera estar sin guardar.

## Contenido y mantenimiento

Los 17 temas cubren primeros pasos, categorías, productos, variantes, imágenes,
publicación, duplicación/archivo/papelera, precios por lote, inventario, costos,
pedidos, cancelaciones/devoluciones, prioridades, gráficos, tienda/WhatsApp,
usuarios y resolución de problemas.

La fuente de los textos es `admin.guide` en `src/dictionary/es.json`.
Cada artículo tiene identificador estable, resumen, pasos, reglas, aviso,
ejemplo ilustrativo, enlace operativo y temas relacionados. No cambiar un
identificador publicado sin mantener sus enlaces.

Cuando cambie un flujo, revisar su guía en la misma entrega. Comprobar los
botones reales y las reglas vigentes, no copiar automáticamente notas de
roadmap de documentos antiguos. Son especialmente sensibles:

| Flujo                  | Regla que debe mantenerse alineada                                |
| ---------------------- | ----------------------------------------------------------------- |
| Pedidos                | Borrador no reserva; confirmar descuenta; pago no verifica dinero |
| Cancelación/devolución | Cuándo se permiten y qué unidades vuelven a stock                 |
| Inventario             | Conteo expresa total físico; no revertir pedidos desde ajustes    |
| Costos                 | Generales completos por unidad; margen no es beneficio neto       |
| WhatsApp               | Abrir no crea pedido ni reserva; fotos son enlaces públicos       |
| Análisis               | Subtotal sin envío, unidades brutas y estado actual vs período    |

## Implementación y comprobación

Página y contenido renderizados en servidor; formularios GET y enlaces nativos.
Solo un pequeño marco MUI cliente aporta el tema. No hay motor externo de
búsqueda, editor, dependencias ni tablas nuevas. El diccionario enviado al
shell cliente omite los artículos para no cargar la guía en todas las páginas.

Pruebas junto a la ruta y el dominio cubren autorización previa, búsqueda,
enlaces, temas únicos, recuperación de vacío, ayuda contextual y proyección del
diccionario. Revisar en Chrome escritorio/móvil, claro/oscuro, búsqueda, índice,
retorno del navegador y acceso sin sesión. Ninguna comprobación necesita crear
pedidos ni modificar existencias.
