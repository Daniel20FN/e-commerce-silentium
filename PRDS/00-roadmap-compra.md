# Roadmap de compra — carrito y cierre por WhatsApp

**Dirección vigente:** catálogo → carrito → mensaje preparado en WhatsApp → atención y cierre manual. Por indicación del usuario, no habrá pasarela de pago de momento. Este flujo sustituye la propuesta anterior de checkout/pagos como entregas inmediatas.

## Primera entrega

[PRD 06 — Carrito](06-prd-carrito.md): seleccionar variantes y cantidades, conservarlas localmente, revisar subtotal y abrir WhatsApp del negocio con el resumen preparado. El cliente revisa y pulsa enviar en WhatsApp; abrir el chat no demuestra envío ni confirma compra.

## Reglas

- Carrito de invitado local sin sincronización entre dispositivos (aprobado).
- Aprobado: abrir WhatsApp sin iniciar sesión. El requisito anterior de login en checkout no aplica a este canal.
- Revalidar precios, disponibilidad y cantidades en servidor antes de preparar el mensaje. No compartir costos/márgenes privados.
- Mensaje con producto, variante/SKU, cantidad, importes COP y enlaces públicos. Envío y forma de pago se acuerdan por conversación.
- Se pueden incluir enlaces de imagen; un enlace de chat con texto no adjunta fotos automáticamente ni garantiza vistas previas.
- No crear pedido confirmado, registrar pago, reservar/descontar stock ni vaciar el carrito por abrir WhatsApp.
- Sin automatización de envío ni WhatsApp Business Platform en esta entrega.

## Configuración y próximos pasos

1. Número receptor confirmado: **+57 316 6218114**; destino normalizado de WhatsApp: `573166218114`.
2. Apertura sin login confirmada por el usuario.
3. Mensaje implementado con resumen por variante y enlaces de fotos públicas. Añadir enlaces de ficha cuando se defina el dominio; por ahora se omiten con aviso.

Checkout online y pasarela siguen aplazados. Los pedidos persistidos, inicialmente fuera de esta primera entrega, se planifican ahora como gestión manual en el ciclo operativo siguiente.

### Continuación aprobada: operación administrativa

El [roadmap operativo PRD 07–12](00-roadmap-operacion-tienda.md) desarrolla ahora inventario y pedidos **manuales** posteriores a la conversación. El [PRD 11](11-prd-pedidos-manuales-whatsapp.md) conserva la ausencia de checkout/pasarela: abrir el chat sigue sin crear venta ni consumir stock; el gestor confirma el pedido en el panel y esa confirmación descuenta existencias. El pago inicial solo registra pendiente/pagado. Las políticas de cancelación y devolución siguen pendientes antes de implementar pedidos.

## Validación

Chrome móvil/escritorio: mensaje completo, caracteres especiales, destino, enlaces públicos, cambios de catálogo y mensajes extensos. No enviar mensajes reales durante QA sin autorización. No mostrar compra confirmada por abrir un chat.

Referencia: [WhatsApp — Click to chat](https://faq.whatsapp.com/5913398998672934).
