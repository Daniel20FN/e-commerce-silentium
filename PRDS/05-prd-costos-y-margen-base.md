# PRD 05 — Costos de producción y margen base del catálogo

## Problema

Publicar productos sin entender su costo real impide tomar decisiones comerciales correctas. El negocio necesita registrar múltiples costos manuales por producto o variante para conocer costo total, margen estimado y composición del gasto, sin depender de cálculos externos o aproximaciones informales.

## Objetivo

Permitir que el equipo administrativo cargue costos manuales por concepto y consulte una visión base de costo total y margen estimado, con foco operativo y sin requerir todavía historial ni analítica avanzada.

## Usuarios y contexto

- **Super admin / admin**: cargan y revisan costos.
- **Equipo comercial**: usa el margen resultante para tomar decisiones de pricing.

## Valor de negocio

- Da visibilidad inicial sobre rentabilidad real.
- Permite identificar qué está costando más producir.
- Prepara el terreno para analítica futura sin esperar una versión avanzada.

## Alcance

### Incluye

- Registro manual de múltiples costos por concepto.
- Asociación de costos a producto general o variante específica.
- Edición y eliminación operativa de costos.
- Visualización del costo total acumulado.
- Visualización del margen estimado a partir del precio de variante.
- Resumen simple de composición de costo por variante.

### No incluye

- Historial de costos.
- Versionado temporal.
- Proveedores.
- Simulación avanzada de escenarios.
- Reportes financieros complejos.

## Requisitos funcionales

1. El admin puede agregar múltiples ítems de costo manualmente.
2. Cada ítem de costo debe tener al menos nombre y monto.
3. El ítem de costo puede incluir descripción opcional para contexto.
4. El admin puede asociar un costo al producto general o a una variante específica.
5. El admin puede editar un ítem de costo existente.
6. El admin puede eliminar un ítem de costo que ya no aplique.
7. El sistema debe calcular el costo total aplicable a una variante.
8. El sistema debe mostrar margen estimado usando el precio de la variante seleccionada.
9. El sistema debe permitir ver qué ítems componen el costo total.
10. El sistema debe dejar claro si un costo aplica a nivel producto o a nivel variante.

## Reglas de negocio

- Un costo asociado al producto general puede impactar a todas sus variantes según la regla de cálculo definida.
- Un costo asociado a una variante solo afecta esa variante.
- El margen estimado debe derivarse de precio menos costo total aplicable.
- El sistema no debe obligar a clasificar los costos en una taxonomía predefinida en esta fase.
- Un producto o variante puede existir sin costos cargados, pero el margen no será representativo.

## Casos borde

- Variante con precio pero sin costos.
- Variante con costos y sin precio.
- Costos generales en producto sin variantes activas.
- Costos duplicados cargados manualmente por error.
- Eliminación de un costo que altere significativamente el margen mostrado.

## Requisitos de experiencia de usuario

- El flujo debe ser rápido para carga manual repetitiva.
- Debe ser obvio qué costos afectan una variante específica.
- El margen estimado debe mostrarse como dato de negocio, no como verdad contable final.
- La UI debe ayudar a identificar rápidamente los costos más altos dentro del conjunto cargado.

## Criterios de aceptación

- Dado un admin, cuando agrega varios ítems de costo válidos a una variante, entonces el sistema los guarda y actualiza el costo total.
- Dado un producto con costos generales y una variante con precio, cuando el admin consulta esa variante, entonces puede ver costo total y margen estimado.
- Dado un ítem de costo erróneo, cuando el admin lo edita o elimina, entonces el sistema recalcula el total resultante.
- Dado que no existe historial en esta fase, cuando un costo se modifica, entonces el sistema conserva solo el valor vigente.

## Métricas de éxito

- Porcentaje de variantes con costo cargado.
- Tiempo requerido para registrar costos base por producto o variante.
- Uso operativo de la vista de margen durante decisiones de precio.

## Dependencias

- PRD 02 completado, ya que las variantes son la unidad real de margen.

## Riesgos

- Interpretar el margen estimado como contabilidad definitiva.
- No distinguir correctamente costos generales versus específicos.
- Sobrecargar la UI con demasiados datos antes de tener reportes avanzados.

## Open questions

- Cómo se distribuirán exactamente los costos generales del producto sobre sus variantes en la primera versión.
- Si la moneda quedará fija en COP durante esta fase.
