# Roadmap — Operación diaria de la tienda

**Estado:** alcance de las seis entregas aprobado el 20 de octubre de 2026. PRD 07–08 implementados, verificados y aceptados; PRD 09 (duplicación/precios) implementado, verificado y aceptado; stock rápido diferido a PRD 10; PRD 10 implementado, verificado y aceptado; PRD 11–12 siguen en planificación. Las reglas señaladas como propuestas no están aprobadas por implicación.

El siguiente ciclo mejora el trabajo del gestor: preparar un producto, publicarlo con confianza, repetir operaciones con menos esfuerzo y registrar inventario y ventas cerradas manualmente. No añade checkout ni pasarela.

## Punto de partida

PRD 01–05 y el carrito del PRD 06 ya aportan categorías, productos, variantes, precios/stock, imágenes, costos/margen y solicitud por WhatsApp. Se reutilizan sus servicios, autorizaciones, uploader y reglas; no se reconstruye el CRUD.

La landing integrada en main tampoco se rediseña en este ciclo. El admin sigue la dirección operativa de `DESIGN.md`, no la estética editorial de la landing.

## Entregas y dependencias

| Orden | Documento                                                                   | Resultado usable                                                                                              | Dependencias                                   |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1     | [PRD 07 — Ficha de producto](07-prd-ficha-producto-admin.md)                | Información, variantes, imágenes, costos y publicación en un único espacio; protección del trabajo pendiente. | PRD 01–05                                      |
| 2     | [PRD 08 — Publicación y vista previa](08-prd-publicacion-y-vista-previa.md) | Saber qué se verá, qué impide vender y cómo corregirlo.                                                       | PRD 07 y reglas públicas del PRD 04            |
| 3     | [PRD 09 — Operaciones rápidas](09-prd-operaciones-rapidas-catalogo.md)      | Duplicar borradores y editar precios de varias variantes con seguridad.                                       | PRD 07–08; stock rápido se completa con PRD 10 |
| 4     | [PRD 10 — Inventario](10-prd-inventario-movimientos.md)                     | Entradas, salidas y ajustes trazables por variante; alertas de mínimo.                                        | PRD 07; integra la operación rápida del PRD 09 |
| 5     | [PRD 11 — Pedidos manuales](11-prd-pedidos-manuales-whatsapp.md)            | Registrar el cierre por WhatsApp, confirmar pedidos y descontar stock una sola vez.                           | PRD 10 y decisiones de cancelación/devolución  |
| 6     | [PRD 12 — Inicio operativo](12-prd-inicio-operativo-admin.md)               | Prioridades reales de catálogo, inventario y pedidos con accesos a resolverlas.                               | PRD 08, 10 y 11                                |

El PRD 09 puede entregar duplicación y precios sin esperar inventario; no debe introducir otro camino definitivo de escritura de stock. CSV/Excel queda como ampliación posterior, no como requisito de cierre de esas seis entregas.

## Reglas confirmadas

| Decisión           | Regla aprobada                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Canal de venta     | Catálogo → carrito de invitado → WhatsApp → atención y cierre manual. Sin pasarela.                                                    |
| Descuento de stock | Al confirmar un pedido manual; un borrador no descuenta ni reserva.                                                                    |
| Pago inicial       | Solo pendiente/pagado. Sin abonos ni cobro automático. Es independiente del estado del pedido.                                         |
| Duplicación        | Copia información, opciones, variantes e imágenes; destino borrador, stock cero, SKU nuevos. Costos únicamente con elección explícita. |
| Reutilización      | Mantener el uploader existente y la gestión de galerías generales/por variante.                                                        |
| Privacidad         | Costos, márgenes, pedidos, contactos y movimientos administrativos no se exponen en la tienda pública.                                 |

## Decisiones todavía pendientes

No bloquean comenzar el PRD 07, pero sí la entrega que las necesita.

| ID   | Decisión                               | Propuesta para revisar                                                                                                                                                                     | Antes de             |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| D-01 | Cancelación antes de entregar          | Revertir una sola vez el descuento del pedido si la mercancía no ha salido; exigir confirmación y motivo. Cancelar no significa reembolsar.                                                | PRD 11               |
| D-02 | Devoluciones y cancelación tras salida | No reponer automáticamente. Registrar recepción física y cantidad apta para volver a stock, enlazada al pedido original. Definir si habrá devoluciones parciales en la primera versión.    | PRD 11               |
| D-03 | Datos mínimos del pedido               | Nombre/contacto, líneas y cantidades; dirección solo cuando el envío la requiera. Gastos de envío manuales y separados de los productos. Confirmar entrega/recogida y campos obligatorios. | PRD 11               |
| D-06 | Carga masiva                           | Evaluar CSV cuando conozcamos tamaño del catálogo y frecuencia de cambios; antes definir plantilla, validación y reporte de errores.                                                       | Ampliación posterior |

D-05 resuelta el 20 de octubre de 2026: reutilizar archivos de imagen con referencias de galería independientes; las copias no heredan destacado. Ver el diseño y las precauciones de purgado en PRD 09.

D-04 resuelta: mínimo opcional por variante; sin mínimo no hay aviso de stock bajo. Productos archivados/papelera y variantes retiradas quedan en solo consulta hasta restaurar antes de ajustar.

## Restricciones transversales

- Admin y super admin según autorización vigente; no habilitar nuevos roles por suposición. Toda escritura se valida en servidor y exige sesión.
- Reutilizar contratos tipados, servicios y diccionario. Evitar una segunda definición de elegibilidad pública, precio o costo.
- Operaciones con revisión/conflicto explícito: nunca sobrescribir silenciosamente trabajo de otra sesión.
- Dinero en COP con representación exacta ya utilizada. Pedidos históricos conservan sus propios importes; editar catálogo no los reescribe.
- Inventario y confirmación de pedido requieren transacciones, protección ante concurrencia e idempotencia. Ningún reintento puede duplicar una salida.
- Al entrar PRD 10, toda escritura de stock debe pasar por movimientos: editor de variante, generación, duplicación, ajustes rápidos y pedidos. Sin caminos heredados que eludan trazabilidad.
- No convertir clics de WhatsApp en ventas, ni inventar estadísticas de ingresos o ganancias sin datos persistidos que las respalden.
- El producto debe poder seguir existiendo como borrador incompleto. Mejorar la publicación no implica exigir SEO, costos o imágenes como nuevos bloqueos sin acuerdo.

## Cómo ejecutar cada entrega

1. Revisar el PRD y cerrar sus decisiones pendientes.
2. Acordar diseño técnico y cortes de implementación; un PRD no obliga a una PR gigante.
3. Implementar dominio/API/UI necesarios y sus pruebas como una capacidad de extremo a extremo.
4. Verificar Jest, TypeScript, lint, build y Chrome móvil/escritorio. Integraciones reales cuando haya persistencia nueva; datos QA aislados y limpieza.
5. Presentar el resultado para aceptación antes de iniciar la entrega siguiente. No fusionar ni desplegar automáticamente por este documento.

## Cierre del ciclo

- [x] Se crea y publica un producto completo sin alternar entre ventanas inconexas.
- [x] Se distinguen bloqueos reales y recomendaciones; borradores privados tienen vista previa segura.
- [ ] Duplicar no arrastra SKU ni stock y la edición rápida no pierde cambios concurrentes.
- [ ] Todo cambio de inventario es explicable y las ventas confirmadas descuentan exactamente una vez.
- [ ] El gestor registra y consulta pedidos sin depender de memoria o conversaciones dispersas.
- [ ] El inicio muestra trabajo real pendiente, no tarjetas decorativas ni cifras ficticias.

## Continuidad

Este ciclo desarrolla las capacidades que quedaron fuera del [roadmap de catálogo](00-roadmap-catalogo-admin.md) y amplía el [roadmap de compra](00-roadmap-compra.md) únicamente con gestión administrativa posterior al cierre manual. No cambia las garantías del [PRD 06](06-prd-carrito.md).
