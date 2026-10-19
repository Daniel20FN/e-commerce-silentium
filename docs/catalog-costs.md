# Costos por unidad y margen estimado (PRD 05)

En **Admin → Productos → Costos y margen** se gestionan conceptos manuales en COP. Cada unidad suma íntegros los costos generales del producto más los de su variante; no se reparte por stock ni por cantidad de variantes.

## Uso

1. Seleccionar el producto y abrir **Costos y margen**.
2. Elegir **Producto general** o una variante como ámbito del costo.
3. Cargar concepto, monto por unidad y descripción opcional. El monto se introduce en pesos, sin separador de miles; admite coma o punto decimal y hasta dos decimales.
4. Consultar una variante en el resumen: precio actual, generales, específicos, total, margen y composición de mayor a menor costo.
5. Editar el valor vigente o retirar un concepto con confirmación. **Ver costos retirados** permite restaurarlo y recalcular el total.

Los formularios conservan sus datos ante errores. Si otra sesión cambia el mismo concepto, la revisión antigua se rechaza: recargar conserva el formulario, y cancelar edición permite seleccionar la versión vigente. Cerrar con datos sin guardar exige descartar explícitamente.

## Reglas

| Tema                             | Comportamiento                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Ejemplo                          | Generales $70.000 + extra Doble $10.000 = costo por unidad Doble $80.000                                                 |
| Margen                           | Precio de venta de la variante menos costo total; porcentaje calculado sobre precio de venta, no sobre costo             |
| Precio cero                      | Margen monetario calculable; porcentaje no calculable                                                                    |
| Sin costos                       | Advertencia de margen no representativo; un costo explícito de cero sí cuenta como cargado                               |
| Pérdidas                         | Margen negativo visible con advertencia, no bloqueado                                                                    |
| Duplicados                       | Aviso por nombre coincidente en el mismo ámbito; no se impone taxonomía ni se prohíben conceptos repetidos intencionales |
| Inactivas / agotadas             | Pueden tener costos y consultarse en el admin; no dependen de stock para el cálculo                                      |
| Papelera de variante             | Sus costos se conservan pero no se modifican hasta restaurar la variante                                                 |
| Producto archivado o en papelera | Solo consulta; no permite altas, cambios, retirada ni restauración de costos                                             |
| Eliminación                      | Lógica y recuperable; no se mantiene historial de importes ni snapshots financieros                                      |

## Persistencia y seguridad

- `CatalogCost`: un producto obligatorio y una variante opcional del mismo producto, concepto, descripción, centavos enteros, revisión y borrado lógico.
- Restricción compuesta de pertenencia de variante/producto, validaciones SQL de monto/nombre y un índice por producto/variante/papelera.
- Montos entre cero y 2.147.483.647 centavos por concepto (límite de `Int` de Prisma). La conversión a centavos es exacta y única; los totales se calculan sin redondear cada sumando.
- RLS habilitado sin políticas de acceso público. La API exige un usuario activo `admin` o `super_admin` y devuelve `Cache-Control: private, no-store`, preservando cookies de sesión renovadas.
- Costos **no incluidos** en DTO, metadata ni consultas públicas del storefront. No se habilitan políticas anónimas para esta funcionalidad.
- Lecturas en snapshot `RepeatableRead`; escrituras bloquean producto y variantes involucradas y comparan `updatedAt` como revisión. Dos ediciones concurrentes de la misma revisión no se sobrescriben silenciosamente.
- API privada: `GET/POST/PUT/PATCH /api/admin/products/[productId]/costs`. Contratos únicos en `src/domains/admin/costs/types/api_params.ts`; validación estricta en servidor. `PATCH` retira o restaura, nunca elimina físicamente.
- La migración aditiva `20261019003000_catalog_costs` está aplicada en desarrollo; en otros entornos usar el despliegue normal de migraciones antes de publicar la aplicación.

## Verificación

- Reglas, schemas, servicio, autorización/cookies/API y UI: Jest.
- Integración opt-in: `CATALOG_COSTS_INTEGRATION=1 npm run test:file -- src/domains/admin/costs/services/cost_service.integration.test.ts` (en PowerShell establecer primero `$env:CATALOG_COSTS_INTEGRATION='1'`). Usa explícitamente `.env.development`, datos QA aislados y limpieza lógica; no toca Storage.
- La integración comprueba sumas y margen, edición sin historial, retirada/restauración, pertenencia cruzada, concurrencia y privacidad SQL.
- Validar además `npx tsc --noEmit --incremental false`, `npm run lint` y `npm run build`. En Windows, terminar los procesos Jest/Next propios antes de regenerar Prisma para liberar la DLL.

Fuera de alcance: proveedores, lotes, impuestos/comisiones automáticos, historial temporal, escenarios y contabilidad definitiva. Peso y dimensiones de variantes siguen siendo atributos administrativos, no componentes automáticos de costo.

### Resultado verificado (2026-10-19)

- Suite completa: **379 pruebas correctas**, 11 integraciones opt-in omitidas en la ejecución normal. Integración de costos ejecutada aparte: **5/5 correctas**.
- TypeScript, lint y build de producción correctos. Lint mantiene avisos preexistentes de `.eslintignore` y del reporte generado de cobertura, sin errores.
- HTTP sin sesión: endpoint de costos responde **401** con `private, no-store`; el producto público responde **200** y no incluye conceptos, importes ni márgenes de costos.
- Chrome, sobre el build final: alta de generales/específicos, edición, retirada con confirmación, restauración y recalculado; ámbito general visible y resumen que sigue la variante elegida.
- Chrome móvil a 390px: diálogo de 326px sin desbordamiento horizontal ni controles fuera de pantalla; validación de monto ambiguo, aviso de duplicado y protección del formulario al cerrar, conservándolo al seguir editando. Viewport restaurado al terminar; sin errores nuevos de consola.
- Demo Aurora retenida: generales $70.000; extra Doble Marfil $15.000 → total $85.000, margen $134.000 (61,19%) sobre precio $219.000. Doble Arena incluye un costo ficticio alto para mostrar la advertencia de pérdida: total $320.000 frente a precio $229.000 → margen -$91.000 (-39,74%). No son costos reales del negocio.

| Criterio PRD 05                                   | Evidencia                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Múltiples costos válidos, generales y específicos | Reglas, servicio, API, PostgreSQL y Chrome                                                        |
| Total y margen desde el precio de variante        | Reglas unitarias y resumen real en navegador                                                      |
| Edición y retirada recalculan el total            | PostgreSQL y Chrome; restauración recuperable añadida                                             |
| Solo valor vigente, sin historial                 | Actualización del mismo ID; prueba de persistencia mantiene un único registro                     |
| Casos borde y seguridad                           | Sin costos, cero, pérdidas, pertenencia cruzada, conflicto concurrente, rol y privacidad SQL/HTTP |
