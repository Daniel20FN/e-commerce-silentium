# Inicio operativo del administrador

El inicio responde qué necesita atención ahora, no cuánto ha vendido la tienda.
Acceso exclusivo de administradores según la autorización vigente. No incorpora
gráficos, contabilidad, pasarela, nuevas tablas ni nuevas escrituras de inventario.

## Criterios compartidos con las listas

| Grupo                       | Entidad y criterio                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Por preparar                | Pedido confirmado, preparación pendiente o en curso.                                                                                                  |
| Por entregar                | Pedido confirmado enviado o listo para recoger.                                                                                                       |
| Pago pendiente              | Pedido confirmado pendiente de pago, incluso entregado. No suma ingresos.                                                                             |
| Agotadas                    | Variante no retirada, stock cero, producto editable. Incluye variantes inactivas que se pueden reponer.                                               |
| Bajo mínimo                 | Variante no retirada de producto editable, `0 < stock <= mínimo`. Sin mínimo no genera alerta.                                                        |
| Borradores                  | Producto borrador, no archivado ni en papelera.                                                                                                       |
| Bloqueo de publicación      | Producto editable que no cumple el predicado público de PRD 08: estado activo, categoría visible (ancestros incluidos) y variante activa no retirada. |
| Visibles sin stock vendible | Producto que cumple el predicado público, pero ninguna variante activa no retirada tiene stock positivo.                                              |

Los borradores también tienen bloqueo de publicación. Los pedidos pueden estar en
una cola de preparación/entrega y simultáneamente en pago pendiente. **No se suman
los grupos.** Fotos, SEO y costos siguen siendo recomendaciones, no nuevos bloqueos.
Archivar un producto nunca oculta un pedido histórico pendiente de atender.

## Fechas y actualización

Todas las colas incluyen pendientes de **todas las fechas**, no solo los creados hoy.
La hora de consulta usa `America/Bogota`, aprobada por el usuario; no depende del
equipo ni del navegador. No existen cortes diarios, ventas del día ni promesas de
tiempo real. Actualizar vuelve a consultar; volver de una ficha carga el estado
actual del grupo, sin mantener una copia de contadores en el cliente.

## Rendimiento, privacidad y recuperación

- Tres bloques server-first con límites Suspense independientes. Cada bloque
  consulta sus totales y hasta dos ejemplos por grupo, dentro de una transacción
  `RepeatableRead` acotada a 15 segundos. Una falla no se presenta como cero.
- Las consultas y la autorización permanecen en servidor. La presentación MUI
  vive en componentes cliente pequeños para recibir el tema activo del admin,
  también en contenido enviado después de Suspense. No inicia consultas al
  montar ni incorpora dependencias nuevas; los enlaces evitan precarga masiva.
- El layout raíz valida la preferencia de tema guardada y entrega el mismo tema
  inicial al servidor y al cliente. Sin preferencia válida sigue siendo claro.
  Esto evita que una carga progresiva conserve paneles claros dentro del modo
  oscuro. Al leer cookies, el HTML se renderiza por petición; no cambia el caché
  de imágenes, fuentes ni otros archivos estáticos. Las fechas se formatean una
  sola vez en servidor para no depender de diferencias de ICU al hidratar.
- `/admin/pendientes?group=…` usa exactamente las mismas políticas: conteo SQL y
  páginas de 20 filas, orden estable por creación e ID, cursor validado.
- La elegibilidad reutiliza el servicio de catálogo de pedidos, limitado a 10.000
  categorías. No se carga todo el catálogo de productos, variantes o pedidos en
  memoria para calcular cifras. Si se excede ese límite, se muestra error honesto.
- Las proyecciones solo contienen identificación/nombre de producto, SKU/saldo/
  mínimo de variante o número de pedido y enlace interno; no contactos, importes
  ni costos privados. Sin endpoints públicos nuevos. Se autoriza en cada página
  antes de iniciar las consultas; middleware mantiene `private, no-store` y noindex.
- Un cursor de una fila que dejó de pertenecer a la cola muestra recuperación
  explícita: volver a primera página. No duplica ni omite filas silenciosamente.
- Los enlaces a fichas conservan solo un grupo interno permitido para volver.
  No se aceptan dominios externos ni destinos administrativos arbitrarios.
- Crear producto abre el editor existente. Inventario abre la cola de agotados;
  cada SKU lleva a la pestaña de inventario de su producto. Registrar pedido abre
  el flujo de PRD 11. Ningún atajo crea datos al navegar.

## Pruebas

Unitarias y componentes en `src/domains/admin/home/`: políticas compartidas, estados
carga/cero/error, navegación, hora de Bogotá, proyección mínima y autorización
antes de lectura. La integración opcional se ejecuta así:

```powershell
$env:OPERATIONS_INTEGRATION = '1'
npm run test:file -- src/domains/admin/home/services/operational_service.integration.test.ts
Remove-Item Env:OPERATIONS_INTEGRATION
```

Exige `DATABASE_URL` explícita en `.env.development`, nunca producción. Solo crea
fixtures QA aislados; prueba categorías con ancestros ocultos/alternativos,
múltiples variantes, umbral inclusivo, papelera/archivado, pedidos y paginación.
Retira lógicamente el catálogo y cierra/cancela sus pedidos de prueba; conserva
eventos y libro de stock inmutables. Sin Storage ni mensajes WhatsApp. Detener
Jest y Next antes de generar Prisma/build en Windows.
