# PRD 11 — Pedidos manuales de ventas por WhatsApp

**Estado:** implementado, verificado y aceptado. Reglas de negocio aprobadas el 21 de octubre de 2026; verificación de Chrome completada el 22 de octubre de 2026. D-01–03 cerradas con la política siguiente.

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

## Modelo funcional

- Identificador interno y número legible único, fecha, creador y revisiones.
- Líneas con referencia de variante y snapshot de nombre, atributos, SKU, cantidad y precio unitario acordado. Cambiar el catálogo después no cambia el pedido.
- Productos con precio actual como valor inicial. El administrador puede negociar un precio con motivo obligatorio; confirmar fija líneas e importes, sin descuentos implícitos ni cambios silenciosos por una edición posterior del catálogo.
- Productos, envío y total diferenciados. Sin impuestos, comisiones, descuentos globales o tarifas automáticas no definidos.
- D-03 aprobada: nombre y WhatsApp obligatorios; modalidad envío o recogida. Dirección obligatoria solo para envío; envío manual y separado. Acceso administrativo privado y minimización de datos, sin copiar conversaciones enteras.
- Estado del pedido: borrador, confirmado, cancelado. Logística separada: pendiente → preparación → enviado (envío) / listo para recoger (recogida) → entregado. Sin retrocesos; las devoluciones son eventos separados que no reescriben la entrega.
- Eventos con actor, fecha, motivo y transición; no eliminación física de pedidos confirmados. Referencias históricas sobreviven a papelera de catálogo.

## Confirmación segura

- Revisar en servidor cantidades, precios aceptados, revisión del pedido, elegibilidad comercial acordada y stock actual. Solo variantes actualmente vendibles conforme a las mismas restricciones públicas: no vender borradores, archivados, papelera ni variantes inactivas. Cancelación y devolución históricas no requieren reactivar el catálogo.
- Confirmación, snapshots definitivos y movimientos de todas las líneas en una transacción. Si una variante no tiene existencias, no descontar ninguna línea.
- Bloquear de forma determinista las variantes para reducir conflictos; pedidos concurrentes nunca sobrepasan saldo disponible.
- Una clave de operación/restricción de transición impide que doble clic, reintento o dos gestores descuenten dos veces el mismo pedido.
- Líneas/importe de un pedido confirmado no se editan libremente. Corrección mediante cancelación/reversión y nuevo pedido o un procedimiento explícito posterior, no alterando saldos silenciosamente.

## Política aprobada: cancelación, devolución y pago

- D-01 aprobada: cancelar antes de la salida física exige motivo y confirmación; repone exactamente una vez las unidades descontadas. Pendiente, preparación y listo para recoger todavía permiten cancelar; enviado y entregado no. Un borrador cancelado nunca repone stock. El pago se conserva, incluso si está pagado.
- D-02 aprobada: después de salida/entrega se permiten devoluciones totales o parciales. Registrar recepción física y unidades aptas para reventa por separado; solo estas últimas reponen stock. La recepción acumulada no puede superar lo vendido, cada operación es idempotente y queda enlazada a sus líneas y movimientos originales.
- Cancelar no equivale a devolver dinero. La primera versión no ejecuta reembolsos; deberá indicar claramente cualquier seguimiento manual requerido sin inventar un tercer estado de pago aprobado.
- Marcar pagado registra una declaración administrativa, no una verificación del banco. Corregir un marcado erróneo exige motivo y evento, sin borrar trazabilidad.

## Aceptación y verificación

- [x] Un borrador conserva importes y datos sin alterar stock; al confirmar hay una única salida por cantidad vendida.
- [x] Stock insuficiente o revisión antigua impide confirmar de forma atómica y conserva el borrador para corregirlo.
- [x] Reintentos/confirmación simultánea no duplican movimientos; editar catálogo no modifica snapshots.
- [x] Pago pendiente/pagado funciona independientemente de confirmación, con autorización e historial.
- [x] Cancelación/devolución respeta la política acordada; ninguna repetición duplica reposición.
- [x] Ni pedido ni datos personales/costos aparecen en endpoints públicos o mensajes ajenos.
- [x] Jest de transiciones/contratos/UI; integración de stock-concurrencia-idempotencia y Chrome con borrador, confirmación, pago, agotado y cancelación QA. No enviar mensajes reales durante QA.

## Evidencia de verificación

- Integración PostgreSQL de pedidos: 16 pruebas aprobadas; inventario: 12 pruebas de regresión aprobadas. Fixtures aislados y catálogo QA retirado lógicamente, sin uploads ni mensajes reales.
- Chrome real, build optimizado local: borrador, precio negociado con motivo, fotos públicas, confirmación, pago, envío, rechazo por stock insuficiente, corrección explícita, recogida y cancelación. Devolución parcial y total acumulada, sin exceder lo vendido ni cambiar el pago.
- Vistas de 390 y 320 píxeles sin desbordamiento horizontal; escritorio revisado.
- Las 224 variantes previas conservaron su stock; cero discrepancias entre movimientos y saldos. Las dos variantes QA terminaron en su saldo inicial antes de retirar el catálogo.
- Rutas administrativas sin sesión: HTTP 401, private/no-store y noindex. Roles SQL anon/authenticated sin acceso a tablas privadas.
- La migración se aplicó solo a desarrollo. No se declara aplicado ni desplegado en producción.

## Fuera de alcance y siguiente entrega

Checkout público, pasarela, abonos, facturación fiscal, CRM, WhatsApp Business Platform, automatización de chat, portal público de seguimiento y reservas de carrito. Continúa con [PRD 12](12-prd-inicio-operativo-admin.md).
