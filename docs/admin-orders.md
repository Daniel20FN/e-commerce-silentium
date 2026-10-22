# Registrar ventas acordadas por WhatsApp

Los pedidos se crean manualmente en **Administración → Pedidos**. Abrir WhatsApp desde el carrito no registra una venta, no confirma pagos y no consume existencias.

## Flujo de trabajo

1. Crear un pedido con nombre y WhatsApp del cliente. Elegir envío o recogida; la dirección solo se solicita para envío.
2. Buscar variantes vendibles, revisar cantidades, precios COP y envío separado. Un precio negociado necesita motivo.
3. Guardar el borrador. Todavía no reserva ni descuenta stock.
4. Confirmar tras revisar el resumen. El servidor valida disponibilidad y descuenta todas las líneas en una única transacción, o no descuenta ninguna.
5. Registrar pago y preparar la entrega. Marcar pagado es una declaración del gestor, no una verificación bancaria.

## Qué se puede cambiar

| Momento | Acción |
| --- | --- |
| Borrador | Editar cliente, entrega, líneas e importes; cancelar sin reponer stock. |
| Confirmado | Pago y seguimiento; líneas e importes quedan fijados. |
| Antes de salida física | Cancelar con motivo; reponer exactamente una vez las unidades descontadas. |
| Después de salida física | Registrar devoluciones totales o parciales recibidas; solo unidades aptas para reventa vuelven al stock. |

La entrega avanza sin retrocesos: pendiente → preparación → enviado / listo para recoger → entregado. **Listo para recoger todavía permite cancelar**. Enviado o entregado no. En recogida, registrar devoluciones solo después de entregar.

Cancelar o devolver mercancía **no ejecuta reembolsos**. El estado pendiente/pagado se conserva y cualquier devolución de dinero se resuelve fuera del sistema. No hay abonos, pasarela, factura fiscal ni mensajes automáticos.

## Concurrencia y recuperación

- Otro pedido puede agotar un borrador antes de confirmarlo. El rechazo conserva el borrador para corregirlo.
- Cada escritura lleva revisión y clave de operación. Una revisión antigua exige revisar el estado actual; no se sobrescribe silenciosamente.
- Si se pierde la respuesta, reintentar la misma propuesta con la misma clave, no crear otra operación. La interfaz mantiene el intento pendiente en la pestaña para recuperarlo; contiene datos del pedido, nunca tokens de sesión.
- Si la escritura terminó y falla la recarga, el mensaje diferencia esos dos hechos. No volver a registrar la venta como solución a una recarga fallida.
- Una edición del catálogo no reescribe precios, SKU o nombres de ventas históricas. Una variación del precio antes de confirmar requiere revisión explícita.

## Inventario e historial privado

Confirmación, cancelación y reposición por devolución generan movimientos con enlaces tipados al pedido, línea y evento. **No se revierten desde el inventario genérico**: hay que actuar desde el pedido para mantener límites y trazabilidad.

Devoluciones acumuladas nunca superan las unidades vendidas. Un producto archivado o en papelera mantiene sus pedidos e historial; recibir una devolución no lo reactiva en la tienda.

Eventos, operaciones, devoluciones y enlaces al inventario son inmutables. No hay borrado físico de pedidos históricos. Los contactos y datos privados solo se consultan mediante las rutas administrativas autenticadas. Las tablas tienen RLS y permisos revocados para roles públicos; esto no equivale a impedir que el propietario de la base de datos altere su estructura.

## Despliegue y pruebas

Aplicar primero la migración de inventario PRD 10 y después `20261021220000_manual_orders`. Usar el entorno correcto y detener escritores antiguos durante el cambio; no usar `db push`, reset ni rollback destructivo del historial. Esta migración no reescribe balances existentes. La compatibilidad del código anterior al PRD 11 tras el cambio no implica que pueda gestionar pedidos nuevos.

La integración opcional usa `ORDERS_INTEGRATION=1` y exige `DATABASE_URL` explícita en `.env.development`. Crea datos QA aislados, sin mensajes ni uploads a Storage; conserva historia y retira el catálogo de prueba con borrado lógico. No ejecutarla contra producción.

Los límites de esta entrega son 25 variantes distintas por pedido, 30 pedidos por página, 20 resultados por búsqueda de variantes, 2.000 eventos por pedido y 10.000 categorías. Alcanzar los límites de historial o catálogo produce un error explícito, nunca una proyección silenciosamente incompleta. Los borradores registran la acción de edición con actor y fecha; no guardan copias completas de datos personales anteriores.

En Windows, detener Next y Jest antes de regenerar Prisma o hacer build para evitar bloquear el motor DLL.

El siguiente alcance es el [inicio operativo del PRD 12](../PRDS/12-prd-inicio-operativo-admin.md), no un checkout público.

## Verificación de esta entrega

- Suite completa: 607 pruebas aprobadas; 50 integraciones opcionales omitidas en la ejecución normal.
- Integraciones reales ejecutadas por separado: pedidos 16/16 e inventario 12/12.
- Chrome real en build optimizado local: fotos, precio negociado, borrador, confirmación, pago, envío, devoluciones parciales, falta de stock y cancelación de recogida. Validación móvil a 320/390 px y escritorio.
- Las 224 variantes previas conservaron su stock. Catálogo QA retirado con historial intacto y sin operaciones de Storage.
