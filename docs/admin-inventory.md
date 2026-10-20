# Inventario trazable por variante

En la ficha del producto, **Inventario** permite registrar entradas, salidas, conteos y reversiones. El precio sigue en **Variantes y precios**. La tienda y el carrito conservan su contrato de cantidad disponible; nunca reciben movimientos, motivos ni actores administrativos.

## Registrar y revisar

1. Elige entrada, salida o conteo y añade las variantes (hasta 25 por lote).
2. Introduce cantidad y motivo por fila; la referencia es opcional. Un conteo expresa el saldo físico total, no una diferencia.
3. Revisa saldos anteriores/propuestos y confirma el lote.
4. Comprueba el historial: tipo, diferencia, saldo anterior/posterior, responsable, fecha y referencia.

El lote completo se revierte si una fila falla, está obsoleta, pertenece a otro producto o dejaría saldo negativo. Una variante inactiva puede ajustarse; una variante en papelera no. Productos archivados o en papelera permiten consultar el historial, pero hay que restaurarlos antes de ajustar. No se reactiva ningún producto automáticamente.

Los conteos sin diferencia también dejan un movimiento y avanzan la revisión. Las revisiones de inventario son independientes de los cambios de precio. **Releer referencias** conserva propuestas y requiere revisar y confirmar de nuevo; no convierte un conteo antiguo en un cambio silencioso.

## Reintentos y correcciones

Cada operación fija una clave UUID, actor y huella del contenido en servidor. Repetir el mismo intento devuelve el resultado sin aplicar otra vez cantidades; reutilizarlo con contenido/actor/producto distintos da conflicto. La intención pendiente se conserva en `sessionStorage` cuando está disponible, incluso tras recargar. No contiene credenciales. Si el almacenamiento del navegador está bloqueado, la protección entre recargas no está disponible; ante un resultado desconocido hay que comprobar el historial antes de iniciar otra operación.

El historial no se edita ni borra. **Revertir movimiento** crea una compensación completa enlazada, una sola vez, sobre el saldo actual. Exige motivo y saldo suficiente; no restaura ciegamente un saldo histórico. No se revierten saldos iniciales ni reversiones. Una corrección distinta se registra como entrada/salida/conteo con motivo. Pedidos y devoluciones se integrarán en PRD 11; aquí no se inventan referencias de ventas.

## Mínimos y alertas

- Cada variante tiene mínimo opcional, entero no negativo.
- Agotado: stock cero, independiente del mínimo.
- Stock bajo: `0 < stock <= mínimo` únicamente cuando hay mínimo configurado.
- Vaciar el mínimo elimina el aviso de stock bajo; no impone un valor global ni envía notificaciones externas.
- Cambiar mínimo usa revisión de inventario y no altera cantidades. La duplicación crea stock cero y mínimo sin configurar.

## Corte y despliegue

La migración `20261020213000_inventory_ledger` debe aplicarse durante una **ventana sin escritores antiguos** antes de desplegar el código nuevo. Bloquea `ProductVariant`, añade mínimo/revisión y crea exactamente un saldo inicial por variante existente, incluidas cero/inactivas/papelera. No reconstruye ventas pasadas ni cambia cantidades. El backfill verifica cantidades/sumas; Prisma registra la migración y su transacción evita medias aplicaciones. No usar `db push`, reset ni ejecutar fragmentos sueltos.

En desarrollo se compararon las 136 variantes antes/después: mismas cantidades, total 346 y 136 saldos iniciales. Esto no acredita otros entornos; allí hay que hacer su propia comprobación. Tras aplicar, un escritor antiguo que intente cambiar stock sin contexto transaccional falla de forma cerrada.

No hay rollback automático destructivo: si se vuelve a una versión anterior, sus cambios de stock quedarán bloqueados. Mantener el libro y sus registros; cualquier plan de reversión de despliegue debe preservar la auditoría.

## Garantías técnicas y mantenimiento

El servidor bloquea producto y variantes en orden estable y usa una transacción para saldo, operación y movimientos. La base genera el movimiento desde la escritura de stock; no existe un segundo trigger que vuelva a cambiar stock al insertar movimientos. Un `UPDATE` de stock sin contexto explícito se rechaza. El contexto usa `set_config(..., true)` dentro de la transacción, nunca una variable de conexión reutilizable.

Los endpoints obtienen el actor de la sesión administrativa, nunca del cuerpo del cliente. La creación/generación/copia inicial incluye actor y motivo técnico. Un `INSERT` técnico sin contexto deja un saldo inicial marcado como sistema (fixtures y herramientas administrativas), sin inventar un empleado. El seed actual no escribe variantes. El editor de metadatos ya no modifica stock y rechaza cambios de cantidad de clientes anteriores.

`InventoryMovement` y `InventoryOperation` son privados con RLS y privilegios revocados a `PUBLIC`, `anon` y `authenticated`. El historial y las operaciones rechazan UPDATE/DELETE; referencias restrictivas impiden eliminarlos en cascada al borrar productos/variantes. Esto no pretende proteger contra un propietario de base que deshabilite triggers o modifique la estructura: las credenciales privilegiadas requieren sus propios controles operativos.

Las fixtures de pruebas que necesitan cambiar stock usan `updateQaStock` con operación, actor y motivo de mantenimiento explícitos, y se retiran lógicamente. No es un camino comercial ni una excepción sin auditoría. No se limpian físicamente registros históricos.

## Comprobación

```powershell
$env:INVENTORY_INTEGRATION = "1"
npm run test:file -- src/domains/admin/inventory/services/inventory_service.integration.test.ts
Remove-Item Env:INVENTORY_INTEGRATION
```

Requiere `DATABASE_URL` explícita en `.env.development` y la migración aplicada. Crea productos QA aislados y los retira al terminar; no sube archivos ni altera stock real. Verifica iniciales/sumas, concurrencia, atomicidad, idempotencia, reversiones, mínimos, inmutabilidad y denegación SQL pública. Terminar Next y Jest antes de generar Prisma o compilar en Windows.
