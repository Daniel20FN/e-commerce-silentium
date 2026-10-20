# PRD 12 — Inicio administrativo con prioridades reales

**Estado:** alcance aprobado; fórmulas y filtros detallados se validan contra los servicios de PRD 08, 10 y 11.

## Objetivo

Sustituir las tarjetas descriptivas actuales por un inicio que responda «¿qué tengo que atender hoy?» y permita resolverlo en un clic. No construir un dashboard de cifras decorativas.

## Contenido mínimo

| Bloque                | Qué muestra                                                                                                   | Acción                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Catálogo por preparar | Borradores y productos con bloqueos reales de publicación/venta, distinguiendo ambos conceptos.               | Lista filtrada o ficha con causa visible. |
| Inventario            | Variantes agotadas y bajo mínimo configurado, sin confundir variantes con productos.                          | Inventario filtrado y ajuste autorizado.  |
| Pedidos               | Confirmados pendientes de preparar/entregar según los estados aprobados; pago pendiente en un grupo separado. | Lista filtrada y pedido concreto.         |
| Accesos rápidos       | Crear producto, consultar inventario y registrar pedido manual.                                               | Flujo real, respetando permisos.          |

El panel puede entregar primero catálogo/inventario si una capacidad posterior aún no existe, pero la aceptación completa requiere pedidos reales. Una capacidad ausente se indica o se oculta; nunca se simula con cifras de ejemplo.

## Reglas de indicadores

- Definir para cada contador entidad, estados incluidos/excluidos, fecha de corte y vínculo al listado que lo explica. El filtro de destino y el contador usan la misma política de dominio.
- Producto sin stock vendible no equivale necesariamente a borrador ni a producto inválido. No sumar esos grupos como si fueran distintos sin advertir solapamientos.
- Agotado por variante, mínimo según PRD 10; no contar papelera como inventario operable ni ocultar una tarea pendiente mediante el archivado del catálogo que referencia un pedido.
- Pedidos cancelados/borradores no se presentan como ventas confirmadas. Los pendientes de pago no se confunden con ingresos cobrados.
- Primera versión sin gráficos de beneficios, ingresos netos, conversión de WhatsApp ni previsiones. Solo añadir importes agregados tras definir qué miden y disponer de snapshots/eventos suficientes.
- Fecha y zona de negocio para agrupaciones diarias requieren configuración explícita. No adoptar el huso horario de la máquina del desarrollador por defecto sin acuerdo.

## Experiencia y rendimiento

- Prioridades en orden operativo y listas cortas con «Ver todos». No cargar en memoria todo el catálogo ni todos los pedidos para calcular contadores.
- Consultas agregadas privadas en servidor con permisos vigentes. Estados de carga, cero real, acceso denegado y error independientes; fallo no se representa como cero.
- Indicar actualización cuando corresponda y ofrecer refresco. No prometer tiempo real sin implementarlo ni mostrar números obsoletos como actuales tras una mutación.
- Enlace directo conserva filtros y permisos. Todo control debe ejecutar una tarea o navegar a una vista existente.
- Admin móvil usable a 320/390 px y escritorio optimizado para lectura rápida; teclado, foco y textos del diccionario.

## Aceptación y pruebas

- [ ] Contadores y listados coinciden sobre fixtures con borradores, activos, agotados, papelera y pedidos en distintos estados.
- [ ] Un producto con varias variantes no infla un contador de productos ni oculta el de variantes agotadas.
- [ ] Se puede pasar de una alerta a resolverla y volver con el resultado actualizado.
- [ ] No hay cifras ficticias, enlaces muertos ni consultas públicas con información administrativa.
- [ ] Un fallo de datos no dice «0 pendientes»; no existe acceso a contactos o importes sin autorización.
- [ ] Jest de políticas/estados, integración de agregaciones/permisos y Chrome móvil/escritorio con datos QA reales, sin escrituras de producción.

## Fuera de alcance

Analítica de marketing, previsiones de ventas, informes fiscales, contabilidad, BI y notificaciones externas. Este PRD cierra el [roadmap operativo](00-roadmap-operacion-tienda.md), no impide ampliaciones posteriores basadas en uso real.
