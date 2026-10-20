# Preparar un producto desde una sola ficha

La ficha privada `/admin/productos/[productId]` reúne información, variantes, imágenes, costos y estado de publicación. Reutiliza los editores y servicios existentes; cada sección guarda por separado.

## Camino rápido

1. En **Productos**, crear un producto con nombre y categorías. Siempre comienza como **borrador**.
2. Tras guardar, completar **Variantes y precios** con SKU, precio y stock. Un producto sin opciones admite una variante simple; el generador necesita opciones.
3. Añadir fotografías en **Imágenes** con el uploader habitual y guardar la galería. Las galerías específicas de variante y su fallback se mantienen.
4. Registrar costos privados en **Costos**. **Publicación** muestra el estado y las advertencias actuales; el checklist y la vista previa pertenecen al PRD 08.
5. **Volver a productos** recupera los filtros, orden y página del listado de origen.

## Guardado y salida

| Situación                                                                           | Resultado                                                                                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Cambiar sección, cancelar, recargar datos o seguir un enlace con cambios pendientes | Permite continuar editando o descartar explícitamente                                                                         |
| Guardado o subida en curso                                                          | Bloquea la salida interna; no ofrece descartar durante la operación                                                           |
| Cerrar o recargar la pestaña                                                        | Solicita el aviso nativo del navegador, sujeto a sus restricciones                                                            |
| Atrás/adelante en Chrome con Navigation API                                         | Cuando el navegador permite cancelar el evento, pide confirmación; no se garantiza para todos los recorridos entre documentos |
| Navegador sin Navigation API                                                        | No se garantiza interceptar recorridos del historial de la misma página; enlaces y aviso nativo siguen protegidos             |
| Error o conflicto de revisión                                                       | Conserva el formulario. Recargar datos exige descartar los cambios pendientes                                                 |
| Producto archivado o en papelera                                                    | Ficha de consulta, sin edición de catálogo; costos conservan sus permisos actuales                                            |

No hay autoguardado, recuperación tras cerrar la pestaña ni botón de guardado global. Las URL administrativas nunca se envían como enlaces públicos de WhatsApp.

## Revisión técnica

- Información y variantes envían `expectedUpdatedAt`; el servidor comprueba la revisión también en el predicado atómico de actualización. Un conflicto devuelve `409` y no sobrescribe la otra sesión.
- La actualización de variante y los cambios de predeterminada comparten transacción, para revertirlos si falla la actualización final.
- Los contratos mantienen el campo de revisión opcional por compatibilidad con consumidores anteriores. Galerías y costos conservan sus controles de concurrencia propios.
- La URL de retorno admite únicamente la ruta del listado local; no puede redirigir a un dominio externo.
- No introduce dependencias, migraciones ni otro uploader.

## Verificación

Ejecutar `npm run test`, `npm run lint`, `npx tsc --noEmit` y `npm run build`. En Windows, detener Jest y Next antes de generar Prisma o compilar.

QA manual: crear un borrador aislado, guardar una variante, subir/guardar una imagen, guardar un costo, comprobar cambios pendientes y conflictos entre dos pestañas; repetir a 320/390 px y escritorio. No publicar fixtures ni modificar productos reales para estas pruebas.

Alcance: [PRD 07](../PRDS/07-prd-ficha-producto-admin.md). Siguiente entrega: [PRD 08](../PRDS/08-prd-publicacion-y-vista-previa.md).
