# Duplicar productos y editar precios por lote

El PRD 09 añade dos acciones dentro de la ficha administrativa, sin cambiar las acciones de las filas del catálogo ni el uploader existente. El stock rápido queda para PRD 10, con movimientos trazables.

## Duplicar sin arrastrar existencias

1. Guarda o descarta los cambios pendientes de la ficha origen.
2. Pulsa **Duplicar como borrador** y revisa las reglas. Los costos están desmarcados inicialmente.
3. Confirma y usa **Abrir la copia creada** para revisar la nueva ficha.
4. Ajusta nombre, categorías, SKU y precios. La copia tiene stock cero y no está destacada; publicarla sigue el flujo del PRD 08.

| Se copia                                                                                       | No se copia                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Información, opciones y valores                                                                | Identificadores, slug y SKU originales                              |
| Variantes activas fuera de papelera, precios, medidas y orden                                  | Existencias, archivado y destacado                                  |
| Referencias de imágenes listas, orden y textos alternativos                                    | Cargas pendientes/fallidas y galerías de variantes omitidas         |
| Categorías activas no retiradas; principal conservada o alternativa válida                     | Categorías no utilizables (se informa su cantidad)                  |
| Costos vigentes generales/específicos solo con elección explícita, con pertenencias remapeadas | Costos retirados, costos de variantes omitidas e historial ficticio |

Si no queda ninguna categoría válida, se crea el borrador para corregirlo en Información, no se inventa una categoría. Un origen archivado o en papelera no admite copia. El mínimo admite hasta 200 variantes activas, 2010 referencias listas y 500 conceptos de costo cuando se elige copiarlos; un exceso aborta toda la operación.

### Reintentos

El mismo intento conserva su clave de operación, revisión y elección de costos, incluso al recargar dentro de la sesión del navegador si `sessionStorage` está disponible. Volver a intentar no crea otro producto si el servidor ya completó la copia. Ante una revisión obsoleta, **Preparar otro intento** relee el producto; después hay que confirmar de nuevo. No se cambian silenciosamente las opciones de una operación ya enviada.

## Revisar precios antes de aplicarlos

1. En **Variantes y precios**, abre **Editar precios por lote**.
2. Escribe importes en COP sin separadores de miles: `125000`, `125000,50` o `125000.50`. Se aceptan hasta dos decimales exactos.
3. Deja vacío el precio anterior para quitarlo; si existe, debe superar al precio nuevo.
4. **Revisar cambios** muestra los importes anteriores y propuestos por SKU. Confirma **Aplicar todos los cambios**.

Solo se incluyen las filas modificadas, hasta 50 por operación. El lote modifica precios, nunca SKU, stock, opciones ni disponibilidad. Si alguna revisión cambió o una variante ya no pertenece al producto, se revierte todo el lote.

Un error conserva los importes introducidos. **Releer referencias (conserva cambios)** actualiza las revisiones y los campos que no editaste, sin sobrescribir los propuestos. Revisa las diferencias y confirma otra vez. Una variante retirada permanece visible con su propuesta hasta que quites ese cambio. El guard de la ficha protege el trabajo pendiente al salir o cambiar de editor, con las limitaciones de navegación nativa ya documentadas en PRD 07.

## Imágenes compartidas, galerías independientes

Las copias referencian el mismo archivo público, pero tienen filas `CatalogImage` nuevas. Ordenar, cambiar el texto alternativo o retirar una imagen de una ficha no toca la otra. No hay subida adicional ni borrado físico de Storage en la copia o retirada de referencias. El uploader sigue reservando y subiendo archivos nuevos sin sobrescribir objetos existentes.

La unicidad de referencia es ahora por `(productId, bucket, path)`; el índice global por `(bucket, path)` permite localizar referencias compartidas. Cualquier futura limpieza física debe comprobar **todas** las referencias, incluidas las que están en papelera. No debe borrarse un objeto por haber retirado solo el producto que lo subió. No restaures el índice único global antiguo mientras existan referencias compartidas.

## Despliegue y pruebas

Aplica primero la migración `20261020133000_catalog_quick_operations` en la base del entorno de destino; la versión anterior del uploader sigue siendo compatible. Usa el flujo Prisma del proyecto, no `db push` ni un reset. `CatalogDuplication` tiene RLS y no concede acceso SQL a roles públicos/usuarios ordinarios; los endpoints exigen autorización administrativa y no permiten caché compartida.

```powershell
$env:CATALOG_OPERATIONS_INTEGRATION = "1"
npm run test:file -- src/domains/admin/products/services/catalog_operations.integration.test.ts
Remove-Item Env:CATALOG_OPERATIONS_INTEGRATION
```

La prueba requiere `DATABASE_URL` explícita en `.env.development`, crea datos QA aislados y los retira al terminar; no sube archivos ni consume stock real. Comprueba idempotencia/concurrencia, aislamiento de galerías/costos, rechazo de datos obsoletos y rollback de precios. En Windows, termina Next y Jest antes de generar Prisma o compilar.
