# Supabase Storage para imágenes del catálogo

## Objetivo

Este proyecto ya quedó preparado para subir imágenes autenticadas desde el admin sin exponer la service role key en el navegador.

- Ruta segura: `POST /api/admin/storage/images`
- Autorización: sesión Supabase existente + verificación de rol admin
- Persistencia física: Supabase Storage usando `SUPABASE_SECRET_KEY` solo en servidor
- Metadata de salida: `bucket`, `path`, `publicUrl`, `contentType`, `size`, `originalName`, `scope`, `entityId`

## Decisión de arquitectura

La implementación actual ASUME un bucket **público** para imágenes del catálogo.

¿Por qué?

- storefront necesita URLs estables para categorías, productos y variantes;
- el admin sube por servidor, así que la secret key nunca llega al cliente;
- formularios futuros solo deben persistir metadata, no resolver signed URLs cada vez.

Si más adelante querés un bucket privado, se puede hacer, PERO cambia el contrato: `publicUrl` deja de ser una URL realmente pública y hay que agregar un resolver de signed URLs para lectura. Ese flujo no forma parte de esta base inicial.

## Variables de entorno

No agregues secretos reales a git. Solo configurá estas variables en tu entorno local/hosting.

```env
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxx"
SUPABASE_SECRET_KEY="sb_secret_xxx"
SUPABASE_STORAGE_CATALOG_BUCKET="catalog-images"
```

Compatibilidad ya soportada por el proyecto:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` sigue funcionando como fallback si todavía no migraste a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY` sigue funcionando como fallback si todavía no migraste a `SUPABASE_SECRET_KEY`.

## Configuración manual en Supabase Dashboard

### 1. Crear el bucket

Dashboard → **Storage** → **New bucket**

Configuración recomendada:

- **Name**: `catalog-images`
- **Public bucket**: `ON`
- **File size limit**: `5 MB`
- **Allowed MIME types**:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/avif`

El nombre del bucket debe coincidir con `SUPABASE_STORAGE_CATALOG_BUCKET`.

### 2. Políticas recomendadas

Para ESTA implementación, la recomendación es simple:

- no habilites uploads directos desde browser;
- mantené las escrituras centralizadas en la ruta server-side;
- usá la secret key solo del lado servidor.

Eso significa que **no necesitás políticas de INSERT/UPDATE/DELETE para el cliente web**.

Recomendación operativa:

- **lectura pública**: resuelta por el bucket público;
- **escritura**: únicamente vía `POST /api/admin/storage/images`;
- **borrado/reemplazo**: implementarlo más adelante también por servidor.

Si querés dejar documentada la intención en SQL/RLS, podés usar algo así como referencia para NO abrir escrituras al cliente:

```sql
-- No crear políticas de insert/update/delete para anon/authenticated
-- mientras el proyecto use uploads exclusivamente por servidor.
```

### 3. Secretos en hosting

En Vercel, Railway o el proveedor que uses, cargá exactamente las mismas variables del bloque anterior.

## Contrato de la API

### Request

`multipart/form-data`

Campos:

- `file`: archivo imagen
- `scope`: `category | product | variant | shared`
- `entityId` (opcional): id lógico del registro o draft

### Reglas de validación

- tipos permitidos: `image/jpeg`, `image/png`, `image/webp`, `image/avif`
- tamaño máximo: `5 MB`
- `entityId` opcional, pero si se envía debe ser un identificador seguro para path

### Response exitosa

```json
{
  "data": {
    "bucket": "catalog-images",
    "path": "catalog/product/sku-001/2026-04-18/uuid-sabana-premium.webp",
    "publicUrl": "https://.../storage/v1/object/public/catalog-images/catalog/product/sku-001/2026-04-18/uuid-sabana-premium.webp",
    "contentType": "image/webp",
    "size": 123456,
    "originalName": "sabana-premium.webp",
    "scope": "product",
    "entityId": "sku-001"
  }
}
```

## Cómo usarlo desde futuras pantallas admin

Ya existe helper tipado para cliente:

`@/domains/admin/storage/services/upload_admin_storage_image`

Ejemplo:

```ts
const asset = await uploadAdminStorageImage({
  file,
  scope: "product",
  entityId: "sku-001",
});

// Persistir luego en Prisma o en el form draft:
asset.bucket;
asset.path;
asset.publicUrl;
asset.contentType;
asset.size;
asset.originalName;
```

## Paths generados

Formato actual:

```txt
catalog/{scope}/{entityId|unassigned}/{yyyy-mm-dd}/{uuid}-{archivo-sanitizado}.{ext}
```

Esto permite:

- separar categorías, productos y variantes;
- subir assets antes de tener persistencia final (`unassigned`);
- evitar colisiones por nombre;
- mantener un path legible para soporte y mantenimiento.

## Archivos involucrados

- `src/app/api/admin/storage/images/route.ts` — ruta segura de upload
- `src/domains/admin/storage/services/admin_storage_image.ts` — validación y path builder
- `src/domains/admin/storage/services/upload_admin_storage_image.ts` — helper cliente multipart
- `src/domains/admin/storage/types/*` — contratos tipados para futuros formularios

## Siguientes pasos naturales

1. usar este helper en los formularios admin de categorías/productos/variantes;
2. persistir la metadata en Prisma cuando exista CRUD de catálogo;
3. agregar ruta server-side de borrado para evitar archivos huérfanos;
4. si aparecen drafts complejos, definir una estrategia de limpieza para paths `unassigned`.
