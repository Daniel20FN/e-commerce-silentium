# PRD 10 — Inventario y movimientos por variante

**Estado:** implementado, verificado y aceptado por el usuario; PR y fusión autorizadas. Aprobados mínimo opcional por variante y archivados/papelera solo consulta hasta restaurar. Descuento por pedido al confirmar ya aprobado; política de devoluciones pendiente para PRD 11.

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
- Ajustes en variantes activas/inactivas según permisos actuales. Productos archivados/en papelera y variantes retiradas: solo consultar historial hasta restaurar; no ajustar ni revertir antes. No reactivar productos por un ajuste.

## Alertas de mínimo — D-04 aprobada

- Umbral opcional por variante, entero no negativo. Stock bajo si `0 < stock <= mínimo`; agotado si stock cero. Son grupos distinguibles.
- Sin mínimo configurado no inventar un umbral global ni avisos de bajo stock. La consulta de agotados sigue funcionando.
- Avisos dentro del panel; no correo, WhatsApp automático ni compras a proveedores.

## Aceptación y pruebas

- [x] Entrada/salida/conteo genera movimiento con actor, razón y saldos coherentes; errores no dejan media operación.
- [x] Dos salidas simultáneas no producen saldo negativo ni pérdida de movimiento.
- [x] Reintentar una operación confirmada devuelve su resultado sin repetir el delta.
- [x] Migrar conserva todas las existencias actuales y es repetible sin duplicar saldos iniciales.
- [x] Toda escritura comercial de stock deja movimiento, incluida la generación inicial y tabla rápida.
- [x] Historial sigue consultable tras archivar un producto y no se expone públicamente.
- [x] Jest, integración PostgreSQL de concurrencia/idempotencia/reversión/migración y Chrome con entradas, conteo conflictivo y agotado.

## Evidencias y límites

- Desarrollo: 136 variantes comparadas antes/después del corte, cantidades idénticas (346 unidades), un saldo inicial por variante. Repetir `migrate deploy` no aplica cambios ni duplica iniciales.
- PostgreSQL real: 12 pruebas de inventario aprobadas (incluye creación/generación inicial con actor), más 11 de regresión de carrito/publicación/duplicación.
- Chrome sobre build optimizado con entorno de desarrollo: mínimo opcional, lote de entrada, salida concurrente, conteo obsoleto rechazado, relectura conservando propuestas, confirmación nueva, alerta de mínimo, reversión conservando original, conteo móvil a cero y consulta de producto archivado.
- Sin desbordamiento de documento a 320/390 píxeles; confirmación móvil comprobada. Filtros por tipo/referencia verificados en Chrome; fechas y orden inválido cubiertos por pruebas de componente/contrato, sin afirmar prueba manual del selector de fecha.
- Las 136 existencias previas quedaron otra vez idénticas al finalizar QA; ningún producto real consumió stock. Solo el ejemplo QA recibió y compensó movimientos; conserva mínimo de aviso 3 en la primera variante y todo su historial.
- Migración aplicada solo en desarrollo. En otros entornos requiere ventana sin escritores antiguos; consultas/movimientos administrativos siguen privados. Regresión final: 565 pruebas Jest aprobadas (34 integraciones opcionales omitidas), 101 suites; TypeScript y build aprobados, lint sin errores (un warning previo del JavaScript generado de cobertura).
- Guía técnica, idempotencia, restricciones y comandos: [Inventario administrativo](../docs/admin-inventory.md).

## Fuera de alcance y continuación

Multialmacén, lotes físicos, números de serie, proveedores, reservas temporales de carrito y valoración contable del inventario. Continúa con [PRD 11](11-prd-pedidos-manuales-whatsapp.md).
