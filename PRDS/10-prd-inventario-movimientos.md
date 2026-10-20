# PRD 10 — Inventario y movimientos por variante

**Estado:** alcance aprobado. Descuento por pedido al confirmar aprobado; mínimos y política de devoluciones pendientes según el [roadmap](00-roadmap-operacion-tienda.md).

## Objetivo

Que el gestor pueda explicar de dónde sale la cantidad disponible de una variante y corregirla con trazabilidad, sin perder actualizaciones de otra sesión.

## Alcance y flujo

1. Consultar saldo actual e historial de una variante, con filtros por fecha, tipo y referencia.
2. Registrar entrada, salida manual o ajuste por conteo con cantidad y motivo.
3. Ver saldo anterior/posterior, quién lo hizo y cuándo.
4. Consultar agotados y, si se aprueba/configura su umbral, stock bajo.

## Reglas de inventario

- La variante sigue siendo la unidad de stock. Cantidades enteras, saldo no negativo y sin sobreventa intencional en esta fase.
- Tipos mínimos: saldo inicial, entrada, salida, ajuste y reversión; venta/devolución usan referencias tipadas al entrar PRD 11.
- Un movimiento conserva variante, delta firmado, saldo previo/posterior, motivo, actor, fecha, referencia e identificador idempotente de operación.
- Historial inmutable: corregir con un nuevo movimiento enlazado, no editar/borrar el anterior ni permitir que papelera de producto lo elimine en cascada.
- Saldo y movimiento se escriben en una misma transacción. Bloqueo/actualización condicional impide dos salidas incompatibles o escrituras perdidas.
- Un conteo físico debe confirmar la revisión/saldo observado; si cambió mientras se contaba, informar conflicto antes de aplicar una diferencia obsoleta.
- Un reintento con la misma operación no altera el saldo dos veces. Idempotencia se valida en servidor, no solo deshabilitando botones.

## Transición desde el stock actual

- Definir migración y ventana de corte antes de implementar; cada variante existente recibe un saldo inicial igual a su cantidad vigente, no una reconstrucción inventada de ventas anteriores.
- Evitar dobles saldos iniciales al reintentar el despliegue. Verificar saldo cero, variantes inactivas/en papelera y sumas de control.
- Crear variantes con saldo cero; cualquier existencia inicial distinta de cero genera su movimiento. La duplicación del PRD 09 conserva cero.
- Actualizar todos los escritores: editor individual, generador de variantes con stock inicial, tabla rápida, tareas de seed/administración aplicables y pedidos posteriores. Documentar las excepciones de fixtures de pruebas, nunca una excepción comercial.
- Lecturas públicas conservan su contrato y solo reciben cantidad/elegibilidad permitida; motivos, actores y movimientos permanecen privados.
- Ajustes estándar de variantes activas/inactivas según permisos actuales; para papelera/archivado definir antes de diseño si solo se permite consulta/reversión controlada. No reactivar productos por un ajuste.

## Alertas de mínimo — propuesta pendiente D-04

- Umbral opcional por variante, entero no negativo. Stock bajo si `0 < stock <= mínimo`; agotado si stock cero. Son grupos distinguibles.
- Sin mínimo configurado no inventar un umbral global ni avisos de bajo stock. La consulta de agotados sigue funcionando.
- Avisos dentro del panel; no correo, WhatsApp automático ni compras a proveedores.

## Aceptación y pruebas

- [ ] Entrada/salida/conteo genera movimiento con actor, razón y saldos coherentes; errores no dejan media operación.
- [ ] Dos salidas simultáneas no producen saldo negativo ni pérdida de movimiento.
- [ ] Reintentar una operación confirmada devuelve su resultado sin repetir el delta.
- [ ] Migrar conserva todas las existencias actuales y es repetible sin duplicar saldos iniciales.
- [ ] Toda escritura comercial de stock deja movimiento, incluida la generación inicial y tabla rápida.
- [ ] Historial sigue consultable tras archivar un producto y no se expone públicamente.
- [ ] Jest, integración PostgreSQL de concurrencia/idempotencia/reversión/migración y Chrome con entradas, conteo conflictivo y agotado.

## Fuera de alcance y continuación

Multialmacén, lotes físicos, números de serie, proveedores, reservas temporales de carrito y valoración contable del inventario. Continúa con [PRD 11](11-prd-pedidos-manuales-whatsapp.md).
