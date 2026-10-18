# Administrar imágenes del catálogo

El panel de productos permite gestionar una galería general y otra por variante reutilizando `FilesUploader` y `FilesViewer`. Solo admin y super_admin tienen acceso. El storefront completo se entrega en el PRD 04; esta fase deja listo el resolver de imágenes.

## Uso

1. En Productos, abrir **Imágenes** y elegir producto o variante.
2. Seleccionar archivos, ordenar con las flechas y editar los textos alternativos.
3. Guardar la galería. La primera imagen es la principal; las retiradas pasan a papelera tras confirmación.
4. Restaurar desde papelera cuando haya espacio. Se añade al final, sin desplazar la principal actual.

| Regla           | Comportamiento                                                                                |
| --------------- | --------------------------------------------------------------------------------------------- |
| Cantidad        | 10 imágenes generales y 10 por variante; constantes centralizadas en `catalog_media_rules.ts` |
| Formatos y peso | JPEG, PNG, WebP y AVIF; hasta 5 MiB, validación MIME, firma y tamaño en servidor              |
| Principal       | Primera imagen activa según orden; no existe un segundo flag que pueda quedar incoherente     |
| Fallback        | Una variante con imágenes propias usa solo esas; sin propias hereda las generales             |
| Sin imágenes    | Estado explícito, sin impedir que exista el producto                                          |
| Eliminación     | Lógica y recuperable; el objeto de Storage no se elimina físicamente ni se revoca su URL      |

## API y persistencia

`/api/admin/products/[productId]/media` exige sesión administrativa y devuelve respuestas sin caché:

| Metodo | Contrato                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `params={variantId}`: ID de variante o `null`; devuelve galeria, papelera, imagenes resueltas, origen, revision y limite |
| POST   | Multipart `file`, `revision`, `variantId` opcional; subida con metadata reservada previamente                            |
| PUT    | `{variantId,revision,images:[{id,altText}]}`: orden y alt; los IDs activos omitidos pasan a papelera                     |
| PATCH  | `{variantId,revision,imageId}`: restaurar un registro de papelera                                                        |

Los contratos están en `src/domains/admin/media/types/api_params.ts`. `listStorefrontCatalogImages` ofrece la lectura server-side para el PRD 04 y excluye productos no activos, variantes inactivas y registros eliminados o no listos.

`CatalogImage` conserva bucket, path, URL, tipo, tamaño y estado de subida. Una clave foránea compuesta impide asignar imágenes a variantes de otro producto. RLS está habilitado sin políticas públicas para esta tabla; las escrituras pasan por la API y Prisma del servidor.

### Subida directa para producci�n

El editor utiliza `/media/upload`: POST reserva metadata y devuelve `{imageId,signedUrl}`; PUT `{variantId,imageId}` valida el objeto y finaliza; DELETE con el mismo cuerpo cancela �nicamente metadata pendiente. Todas requieren sesi�n administrativa. La URL firmada no se persiste ni se registra.

El archivo no atraviesa una funci�n de Vercel: su [l�mite de payload es 4,5 MB](https://vercel.com/docs/functions/limitations), inferior a los 5 MiB admitidos. Se usa [subida firmada de Supabase](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), con permiso limitado al objeto. El POST multipart queda como alternativa server/dev, no como transporte del editor desplegado.

## Concurrencia y errores parciales

- Las mutaciones bloquean la fila del producto para validar cuota y alcance sin carreras.
- La revisión de la galería evita que una sesión sobrescriba cambios de otra; un conflicto devuelve 409 y pide recarga explícita.
- Se reserva metadata y path como `pending` antes de subir. Solo `ready` participa en galerías y fallback; un fallo queda registrado como `failed` o pendiente de reconciliación si la DB no responde.
- Las reservas pendientes consumen cuota durante 15 minutos. La finalización vuelve a comprobar cuota y revisión, por lo que una subida tardía no puede superar el límite.
- Si una subida múltiple falla parcialmente, las ya terminadas permanecen y no se vuelven a subir al reintentar en la misma sesión. Ante pérdida de respuesta o conflicto, recargar antes de reintentar evita duplicados.
- Los registros `pending` antiguos y `failed` conservan la referencia para mantenimiento futuro. Esta fase no ejecuta purgas automáticas ni borrados físicos.

## Storage y despliegue

Se ha provisionado `catalog-public-images` en el proyecto configurado: lectura pública, 5 MiB y los cuatro MIME permitidos. Se verificó RLS de Storage habilitado, sin políticas de escritura para clientes, y una subida anónima fue rechazada. Las escrituras usan la clave privilegiada exclusivamente en el servidor tras autorización del usuario.

El bucket privado anterior no cambió y sus objetos no se migraron ni se hicieron públicos. Los archivos de entorno locales apuntan al nuevo bucket y no deben versionarse.

**Antes de desplegar en otro entorno o Vercel:**

- Configurar `SUPABASE_STORAGE_CATALOG_BUCKET=catalog-public-images` en el entorno alojado; cambiar `.env` local no cambia las variables de Vercel.
- Si el entorno utiliza otro proyecto Supabase, provisionar allí el bucket con las mismas restricciones y comprobar sus políticas.
- Aplicar `20261016210000_catalog_media` y `20261016220000_catalog_media_signed_upload` con el flujo de migraciones del entorno destino.
- La configuraci�n de `next/image` permite �nicamente la URL de Supabase y el path p�blico del bucket configurado. Si cambian esas variables, reconstruir el despliegue.
- Mantener la clave privilegiada fuera de variables `NEXT_PUBLIC_*`.
- No añadir políticas INSERT/UPDATE/DELETE para anon/authenticated al bucket; público solo significa lectura pública.

Referencia: [subidas estándar](https://supabase.com/docs/guides/storage/uploads/standard-uploads) y [control de acceso de Storage](https://supabase.com/docs/guides/storage/security/access-control).

## Verificación

- `npm run test`: pruebas de API, servicio, multipart, firmas y editor con uploader real.
- `CATALOG_MEDIA_INTEGRATION=1` con el test PostgreSQL indicado en `AGENTS.md`: concurrencia real, revisión, FK y RLS. Los fixtures son exclusivos QA, sin archivos, y se retiran a papelera.
- Probar en navegador general/variante, principal/orden, texto alternativo, fallback, papelera/restauración y diseño móvil.

### Resultado de la verificaci�n (18/10/2026)

- Compilaci�n de producci�n y TypeScript: correctos. Jest: 291 pruebas correctas; las 3 de integraci�n se omiten en la ejecuci�n normal y se ejecutaron aparte con �xito contra PostgreSQL.
- Lint: sin errores; el comando global conserva el aviso previo de un archivo generado en `coverage/`.
- Navegador, versi�n de producci�n local: selecci�n m�ltiple, subida firmada, orden, textos alternativos y persistencia tras recarga comprobados con el uploader existente.
- Archivo PNG de exactamente 5 MiB: subida, finalizaci�n y visualizaci�n correctas. SVG rechazado sin alterar la galer�a.
- Variante: herencia general, prioridad de im�genes propias, retirada a papelera y restauraci�n comprobadas.
- Producto: retirar la principal promueve la siguiente; restaurar a�ade al final sin desplazarla.
- M�vil a 390 � 844: di�logo sin desbordamiento horizontal y vista previa accesible mediante clic. Corregida la superposici�n de la etiqueta principal sobre los botones.
- Protecci�n de cambios locales al cerrar: comprobada. Los fixtures QA se retiran mediante borrado l�gico; no se purgan objetos de Storage.
- La configuraci�n del bucket est� aplicada en el proyecto Supabase configurado. No se ha desplegado la aplicaci�n ni actualizado variables remotas de Vercel.
