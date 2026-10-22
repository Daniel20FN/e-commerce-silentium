# Análisis administrativo

Ruta privada: `/admin/analisis`, separada del inicio operativo. Solo administradores activos; la autorización precede a las lecturas. No es un sistema contable.

## Qué mide

| Gráfico    | Criterio                                                                                                                                                                           | Período                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Evolución  | Pedidos actualmente confirmados según su **primera confirmación**, no fecha del borrador. Alterna cantidad e importe acordado de productos en COP.                                 | 7/30/90 días de calendario de Colombia, incluido hoy hasta el corte |
| Top 5      | Unidades brutas de líneas confirmadas, agrupadas por producto o variante. Descripción/SKU de la última línea registrada. El archivo del catálogo no borra este histórico.          | Mismo período y cohorte                                             |
| Inventario | Variantes no eliminadas de productos editables, también las inactivas. Agotadas = 0; bajo = positivo hasta mínimo inclusive; sin alerta = resto, incluidos mínimos sin configurar. | Estado actual, no cambia con el período                             |
| Antigüedad | Confirmados pendientes/en preparación/listos/enviados. Días de calendario desde primera confirmación. 0–2, 3–7, 8+; fecha ausente/futura se muestra aparte.                        | Estado actual, todos los períodos                                   |

El importe usa `subtotalCents` del pedido, excluye envío y no representa cobros, beneficio ni ingreso neto. No se descuentan devoluciones físicas. La cancelación posterior excluye el pedido del histórico: las cifras pueden cambiar retrospectivamente. No hay inferencia de conversión desde WhatsApp ni eventos de navegación.

## Implementación y límites

- MUI X Charts **Community 9.16.0 (MIT)**. Importaciones de líneas/barras solo desde un módulo dinámico de esta ruta, sin SSR del SVG; la tabla y el texto sí se renderizan en servidor. No se añade a la landing ni al inicio operativo.
- Cuatro bloques independientes con Suspense, error y vacío explícitos; un fallo no se presenta como cero. Actualizar reconsulta todos. Cada bloque es una transacción RepeatableRead (15 s); comparten el corte de solicitud, **no** una transacción global entre gráficos.
- SQL parametrizado, agregados en PostgreSQL: máximo 90 días, 5 puestos, 3 estados y 4 tramos. No se envían clientes, teléfonos, direcciones, costos o eventos completos al navegador. Sin consultas a Storage ni cambios de stock.
- Fechas UTC persistidas como timestamp sin zona se interpretan explícitamente antes de proyectar America/Bogota; no dependen de la zona del proceso o sesión SQL. La fecha/hora de corte llega formateada desde servidor.
- Cantidades/importes agregados se validan como enteros seguros. Las tablas y tooltips monetarios conservan céntimos; el eje compacto es orientativo. Sin números demostrativos ni series planas inventadas cuando no hay datos.
- Alternativa accesible «Ver datos del gráfico» con tabla semántica. Las filas de alertas enlazan las colas operativas con el mismo predicado; los productos del ranking enlazan la ficha. No se simulan filtros temporales en listados que no los soportan.
- Los estados actuales no ofrecen un histórico de inventario ni SLA de entrega. No se agregaron migraciones ni índices sin evidencia de necesidad; revisar planes con volumen representativo antes de crecer.

## Verificación

Pruebas unitarias: calendario Bogotá y cambios de año, validación estricta de períodos, precisión/overflow, SQL privado y parametrizado, error frente a cero, controles/tablas/tema y autorización previa.

Pruebas PostgreSQL opcionales:

```powershell
$env:ANALYSIS_INTEGRATION='1'
npm run test:file -- src/domains/admin/analysis/services/analysis_service.integration.test.ts
```

Exigen `DATABASE_URL` explícita en `.env.development`; nunca ejecutar en producción. Crean producto/categoría/pedido QA aislados, cancelan sus pedidos y retiran el catálogo al terminar, conservando historial inmutable. Verifican importes negociados sin envío, cohorte/cancelación, archivo histórico, estados de inventario, edades y sesión SQL no UTC. Comprueban que el stock preexistente no cambia. No envían mensajes ni archivos. Detener Jest/Next antes de generar Prisma/build en Windows.

Auditoría de dependencia: el registro de npm notificó 45 paquetes vulnerables en el repositorio (1 crítico); ninguno entre los paquetes nuevos del lock al añadir Charts. Es deuda previa pendiente de un ciclo de actualización independiente; no se aplicó `audit fix` general.

### Resultado de esta entrega

Suite completa final: 642 pruebas superadas y 59 integraciones opcionales omitidas. Cinco comprobaciones PostgreSQL reales de Análisis superadas (incluida zona SQL no UTC), sin cambios al stock preexistente. Compilación optimizada y comprobación de formato correctas; lint sin errores, con aviso previo en cobertura generada. Las comprobaciones de Chrome cubren 7/30/90 días, cantidad/importe, productos/variantes, tablas por teclado, enlaces a alertas/fichas archivadas y temas claro/oscuro. La revisión independiente final puntuó como resueltos los dos ajustes móviles: espacio de barras a 320px y etiquetas/tablas legibles. Se conserva el sistema visual existente sin reescribir DESIGN.md.
