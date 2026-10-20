# PRD 11 — Pedidos manuales de ventas por WhatsApp

**Estado:** alcance, descuento al confirmar y pago pendiente/pagado aprobados. Cancelaciones, devoluciones y datos de entrega requieren cerrar D-01–03 del [roadmap](00-roadmap-operacion-tienda.md) antes de implementar esta entrega.

## Objetivo y frontera

Registrar dentro del panel lo acordado con el cliente por WhatsApp: productos, cantidades, precio pactado, estado y pago. No leer conversaciones ni inferir ventas de un enlace abierto. No añadir pasarela, facturación fiscal ni envío automático.

## Flujo principal

1. Tras conversar con el cliente, el gestor crea un pedido manual y selecciona variantes y cantidades.
2. Revisa importes COP, datos del cliente/entrega acordados y guarda borrador.
3. Confirma el pedido: servidor revalida existencias y descuenta stock mediante PRD 10, exactamente una vez.
4. Marca el pago pendiente/pagado y actualiza el seguimiento de entrega que se acuerde.
5. Consulta el historial, registra una cancelación o devolución según la política aprobada, sin reescribir hechos pasados.

## Reglas confirmadas

- Borrador no reserva ni descuenta stock; otros pedidos pueden consumirlo antes de confirmar.
- Confirmar no exige que el pago ya esté realizado. Confirmación y pago son dimensiones distintas.
- Solo pago pendiente/pagado en esta fase, sin abonos, integración bancaria ni conciliación automática.
- Abrir WhatsApp no crea pedido confirmado, no marca pago ni modifica carrito/stock. No hay sincronización automática de la conversación.

## Modelo funcional propuesto

- Identificador interno y número legible único, fecha, creador y revisiones.
- Líneas con referencia de variante y snapshot de nombre, atributos, SKU, cantidad y precio unitario acordado. Cambiar el catálogo después no cambia el pedido.
- Productos con precio actual como valor inicial. Si se permite modificar el precio pactado, definir permiso, motivo y validación explícita antes de implementar; nunca un descuento implícito.
- Productos, envío y total diferenciados. Sin impuestos, comisiones, descuentos globales o tarifas automáticas no definidos.
- Datos mínimos del cliente/entrega según D-03; acceso administrativo privado y minimización de datos, sin copiar conversaciones enteras.
- Estado del pedido propuesto: borrador, confirmado, cancelado. Seguimiento logístico separado: pendiente, preparación, enviado/recogida y entregado, por concretar según operación real. No fijar transiciones contradictorias con entrega física.
- Eventos con actor, fecha, motivo y transición; no eliminación física de pedidos confirmados. Referencias históricas sobreviven a papelera de catálogo.

## Confirmación segura

- Revisar en servidor cantidades, precios aceptados, revisión del pedido, elegibilidad comercial acordada y stock actual. Definir si se autorizarán ventas manuales de variantes no publicadas; por defecto propuesto no saltarse las restricciones actuales.
- Confirmación, snapshots definitivos y movimientos de todas las líneas en una transacción. Si una variante no tiene existencias, no descontar ninguna línea.
- Bloquear de forma determinista las variantes para reducir conflictos; pedidos concurrentes nunca sobrepasan saldo disponible.
- Una clave de operación/restricción de transición impide que doble clic, reintento o dos gestores descuenten dos veces el mismo pedido.
- Líneas/importe de un pedido confirmado no se editan libremente. Corrección mediante cancelación/reversión y nuevo pedido o un procedimiento explícito posterior, no alterando saldos silenciosamente.

## Cancelación, devolución y pago — pendientes

- Propuesta D-01: antes de salida física, cancelar con motivo y confirmación revierte una sola vez los movimientos del pedido. Resolver qué estado prueba que no salió y qué ocurre con pedidos pagados.
- Propuesta D-02: después de salida/entrega no reponer automáticamente. Recepción física y cantidades aptas requieren una acción separada; limitar devolución acumulada a lo vendido y evitar dobles entradas.
- Cancelar no equivale a devolver dinero. La primera versión no ejecuta reembolsos; deberá indicar claramente cualquier seguimiento manual requerido sin inventar un tercer estado de pago aprobado.
- Marcar pagado registra una declaración administrativa, no una verificación del banco. Corregir un marcado erróneo exige motivo y evento, sin borrar trazabilidad.

## Aceptación y verificación

- [ ] Un borrador conserva importes y datos sin alterar stock; al confirmar hay una única salida por cantidad vendida.
- [ ] Stock insuficiente o revisión antigua impide confirmar de forma atómica y conserva el borrador para corregirlo.
- [ ] Reintentos/confirmación simultánea no duplican movimientos; editar catálogo no modifica snapshots.
- [ ] Pago pendiente/pagado funciona independientemente de confirmación, con autorización e historial.
- [ ] Cancelación/devolución respeta la política acordada; ninguna repetición duplica reposición.
- [ ] Ni pedido ni datos personales/costos aparecen en endpoints públicos o mensajes ajenos.
- [ ] Jest de transiciones/contratos/UI; integración de stock-concurrencia-idempotencia y Chrome con borrador, confirmación, pago, agotado y cancelación QA. No enviar mensajes reales durante QA.

## Fuera de alcance y siguiente entrega

Checkout público, pasarela, abonos, facturación fiscal, CRM, WhatsApp Business Platform, automatización de chat, portal público de seguimiento y reservas de carrito. Continúa con [PRD 12](12-prd-inicio-operativo-admin.md).
