# Servidor MCP para administración

Permite que administradores (`admin` y `super_admin`) operen la tienda desde agentes compatibles con MCP (Codex, Claude Code, Claude Desktop) mediante un endpoint remoto: `POST /api/mcp` (Streamable HTTP, sin estado, runtime Node). Cada herramienta reutiliza directamente los servicios de dominio del panel, de modo que reglas de negocio, bloqueos, comprobaciones de revisión y actor de auditoría son los mismos que en la interfaz.

Incluye una capa de guía para personas sin experiencia: instrucciones del servidor, herramientas de guía y resumen de la tienda, y recetas guiadas (prompts). No expone usuarios, invitaciones, roles, evidencia legal ni autoservicio de cuenta. No usa el servidor OAuth 2.1 de Supabase. Además de los tokens personales, cualquier cliente MCP puede conectarse con OAuth 2.1 contra el servidor de autorización propio de la aplicación: ver `docs/admin-mcp-oauth.md`.

## Modelo de seguridad

- **Solo `Authorization: Bearer slm_…`.** Las cookies de sesión nunca se aceptan como credencial en `/api/mcp` y el middleware de sesión excluye esa ruta.
- **Tokens personales.** Un token pertenece a un único usuario y actúa con sus permisos _actuales_. El secreto son 32 bytes aleatorios del CSPRNG (256 bits, base64url) con prefijo reconocible `slm_`. En base de datos solo se guarda su hash SHA-256 (`McpAccessToken.tokenHash`, único), un prefijo corto de visualización, el nombre, los alcances, la caducidad, el último uso y la revocación. El texto plano se devuelve una única vez al crearlo; nunca se lista, registra ni vuelve a mostrar.
- **Evaluación en cada petición**: formato del token → búsqueda por hash → no revocado → no caducado → el usuario propietario existe, está `active`, no es una cuenta eliminada (`@deleted.invalid`) y su rol es `admin` o `super_admin`. El rol y el estado se leen de la base de datos en cada llamada; degradar, bloquear o eliminar al usuario corta el acceso del agente de inmediato.
- **Códigos HTTP**: sin token, token mal formado, desconocido, revocado o caducado → `401` con `WWW-Authenticate: Bearer`; propietario no activo o sin rol administrativo → `403`; fallo de base de datos → `503` genérico. Todas las respuestas llevan `Cache-Control: private, no-store`.
- **Alcances**: `read` (solo lectura) o `read`+`write`. Un token de solo lectura no ve las herramientas de escritura en `tools/list` y, si las invoca, recibe un error `insufficient_scope` sin que se ejecute ningún servicio.
- **Tabla privada**: RLS activado y privilegios revocados para `PUBLIC`, `anon` y `authenticated`, igual que las demás tablas privadas. Solo el rol de servidor accede a ella.
- **Límites**: máximo 10 tokens activos por usuario; caducidad obligatoria de 30 o 90 días (máximo 90); `lastUsedAt` se actualiza como mucho una vez por minuto. No hay limitación de tasa distribuida (fuera de alcance).
- **Errores de herramientas**: los errores de dominio (validación, conflicto/revisión, no encontrado, estado inválido, permisos) se devuelven como `isError` con `{ type, code, hint }`. Los errores inesperados devuelven un mensaje genérico, sin traza, consulta SQL ni secretos; los valores de entrada nunca se reflejan. El registro solo contiene el nombre de la herramienta.
- **Textos**: las descripciones de las herramientas son metadatos del protocolo para agentes y están en inglés en el código; no son copy de interfaz. Todo el copy de la pantalla de administración vive en `src/dictionary/es.json` (`admin.agents`). El texto de los prompts es copy visible para la persona (título, descripción y receta en español) y vive en `admin.mcpPrompts` del mismo diccionario, separado de `admin.agents` para no enviarlo al navegador; las instrucciones del servidor (`mcp_instructions.ts`) son metadatos del protocolo para el agente y están en inglés.

## Ciclo de vida de un token

1. En **Administración → Agentes MCP** (`/admin/agentes`), **Crear token**: nombre, permisos (solo lectura / lectura y escritura), vigencia (30 o 90 días) y **contraseña actual**. La contraseña se vuelve a verificar con el mismo cliente aislado y sin persistencia que usan las acciones sensibles de `/account`; no se guarda. Si la cuenta tiene MFA verificado la acción se rechaza, como en `/account`.
2. El secreto se muestra una sola vez, con botón de copiar y aviso. Al cerrar el diálogo se descarta del estado del navegador.
3. El listado muestra nombre, prefijo, permisos, creación, último uso, vencimiento y estado (activo, vencido, revocado).
4. **Revocar** deja el token inutilizable de inmediato. Solo se gestionan los tokens propios.
   **Eliminar** (solo en tokens ya revocados) lo quita del listado para siempre, tras una confirmación que avisa de que no se puede deshacer. Es `DELETE /api/admin/agent-tokens/{id}/permanent`: borra la fila con una única sentencia condicionada a que pertenezca al usuario y tenga `revokedAt` (`404` si no existe o es de otra persona; `409` si sigue activo o solo ha vencido sin revocar). Mismas protecciones que el resto de rutas del panel (sesión de administrador, mismo origen, `no-store`). Los tokens activos o vencidos no se pueden eliminar; revócalos primero.
5. Los tokens vencen solos. Los tokens de usuarios eliminados, bloqueados o degradados dejan de funcionar aunque sigan sin revocar.

Las rutas de apoyo son `GET/POST /api/admin/agent-tokens` y `DELETE /api/admin/agent-tokens/[tokenId]`: sesión por cookie, administrador activo, origen coincidente y JSON para mutaciones.

## Herramientas

Los nombres llevan el prefijo de su grupo. «R» exige alcance `read`; «W» exige `write`; «⚠» lleva `destructiveHint`. Las lecturas llevan `readOnlyHint`. Las escrituras que requieren revisión de concurrencia la exigen como entrada (`expectedUpdatedAt`, `revision`, `expectedRevision`), por lo que un conflicto aparece como error claro de herramienta.

| Grupo          | Herramientas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalog_`     | R: `list_products`, `get_product`, `list_variants`, `preview_variant_generation`, `get_costs`, `list_categories`, `category_parent_options`. W: `create_product` (siempre borrador), `update_product` (revisión obligatoria; no cambia el estado), `duplicate_product`, `create_variant`, `update_variant` (revisión obligatoria), `restore_variant`, `confirm_variant_generation`, `update_prices`, `create_cost`, `update_cost`, `restore_cost`, `create_category`, `update_category`, `restore_category`. W⚠: `delete_variant`, `trash_cost`, `trash_category`, `bulk_categories`. |
| `publication_` | R: `get_state`, `get_preview`. W: `publish`, `restore`. W⚠: `unpublish`, `archive`, `trash`. `publish`/`unpublish` aplican la misma transición que el panel y exigen `expectedUpdatedAt`; revisa `get_state` después, porque los bloqueos mantienen el producto oculto.                                                                                                                                                                                                                                                                                                               |
| `inventory_`   | R: `get`. W: `add_stock` (entradas), `set_minimum`. W⚠: `adjust_stock` (salidas, conteos, reversiones). Pasan por `mutateInventory`/`setInventoryMinimum` y su contexto transaccional de inventario, con el libro inmutable a nombre del usuario.                                                                                                                                                                                                                                                                                                                                     |
| `orders_`      | R: `list`, `get`, `search_variants`. W: `create_draft`, `save_draft`. W⚠: `advance` (confirmar descuenta stock; pago y entrega solo avanzan), `cancel`, `register_return`.                                                                                                                                                                                                                                                                                                                                                                                                            |
| `media_`       | R: `get_gallery`. W: `prepare_upload`, `complete_upload`, `cancel_upload`, `restore_image`, `upload_image_base64`. W⚠: `save_gallery` (las imágenes omitidas pasan a la papelera).                                                                                                                                                                                                                                                                                                                                                                                                    |
| `guide_`       | R: `search` (busca en la guía del panel sin distinguir mayúsculas ni acentos; sin texto lista los 17 temas), `get_topic` (artículo completo: resumen, pasos, notas, advertencia, ejemplo, temas relacionados y ruta del panel; un tema desconocido devuelve `not_found`).                                                                                                                                                                                                                                                                                                              |
| `store_`       | R: `overview` (propietario: nombre y rol; alcances y vencimiento del token; resumen de la tienda con las prioridades del inicio del panel —pedidos por preparar/entregar/sin pago, agotados y bajo mínimo, borradores, no públicos y sin stock— con conteos y pocas filas de muestra; temas de guía sugeridos).                                                                                                                                                                                                                                                                        |
| `analysis_`    | R: `get` (7, 30 o 90 días, calendario de Colombia, instantáneas actuales de inventario y antigüedad).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### Guía para principiantes

- **Fuente única:** `guide_search` y `guide_get_topic` leen `admin.guide` de `es.json` mediante `searchGuideArticles` (la misma lógica que la pantalla `/admin/guia`); no hay copia del contenido. El tema `usuarios` también se puede leer (es documentación), pero las tareas de usuarios, invitaciones, roles, legal y cuenta no son herramientas MCP y se hacen en el panel.
- **`store_overview`** reutiliza `getPriorityBlock` del inicio operativo (`docs/admin-home.md`). Devuelve solo el nombre visible y el rol del propietario del token, sus alcances y vencimiento; nunca el identificador ni el hash del token, costos, datos de clientes ni de otros usuarios. Si un bloque no se puede leer, se informa en `store.unavailable` sin detalles del error. Las sugerencias son códigos (`group`, `count`, `guideTopic`) con el título tomado de la guía: no hay copy nuevo en la herramienta.
- **Instrucciones del servidor** (`mcp_instructions.ts`, enviadas en `initialize`): responder en el idioma de la persona (español por defecto) y con palabras sencillas; preguntar antes de asumir; empezar con `store_overview`; explicar conceptos con las herramientas de guía; leer antes de escribir y reenviar la revisión; explicar y pedir confirmación antes de cada escritura; preferir borradores; avisar de que los movimientos de stock y las confirmaciones de pedido son historial permanente; y remitir al panel (`/admin`) para usuarios, invitaciones, roles, legal y cuenta.

### Prompts (recetas guiadas)

`prompts/list` y `prompts/get` están disponibles por el mismo endpoint y con el mismo token. Cada receta es un mensaje de usuario en español que indica al agente qué herramientas usar, qué preguntar y cuándo pedir confirmación:

| Prompt               | Alcance | Argumento opcional | Qué hace                                                                                        |
| -------------------- | ------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `primer-producto`    | write   | `nombre`           | Categoría, borrador, variantes, existencias, imágenes y revisión de publicación.                |
| `revisar-stock-bajo` | read    | —                  | Revisa agotados y bajo mínimo, explica el stock mínimo y propone reponer solo con confirmación. |
| `registrar-pedido`   | write   | `cliente`          | Pedido manual desde borrador; avisa de que confirmar descuenta stock de forma permanente.       |
| `publicar-producto`  | write   | `producto`         | Diagnóstico de publicación, vista previa y publicación solo con confirmación explícita.         |

Los prompts de escritura no se listan a tokens de solo lectura y `prompts/get` los rechaza con un error `-32602`. El argumento opcional se recorta (200 caracteres, una línea) y se presenta como texto de referencia, no como instrucciones. Una prueba comprueba que toda herramienta citada en prompts e instrucciones exista en el registro.

**Soporte de clientes** (verifica la versión que uses): el servidor siempre envía las instrucciones y las herramientas, que es lo que garantiza el comportamiento guiado en cualquier cliente. Los prompts dependen del cliente: Claude Code los expone como comandos `/mcp__silentium__<prompt>`; en Claude Desktop (vía `mcp-remote`) aparecen, según la versión, en el selector de adjuntos/conectores; no se ha confirmado soporte de prompts MCP en Codex, donde basta pedir la tarea en lenguaje natural porque las instrucciones y `store_overview`/`guide_*` cubren la misma guía.

### Imágenes

- **Subida firmada (recomendada):** `media_get_gallery` → `media_prepare_upload` devuelve `{ imageId, signedUrl }` → el agente envía los bytes con `PUT` a `signedUrl` (multipart `cacheControl` + archivo, como el panel; si Storage lo rechaza, añade la clave pública del proyecto en la cabecera `apikey`, como hace el panel; este recorrido aún no se ha probado contra Storage real) → `media_complete_upload`. Se acepta JPEG, PNG, WebP o AVIF de hasta 5 MB.
- **Alternativa pequeña:** `media_upload_image_base64` recibe el archivo codificado en base64. El tamaño decodificado se limita a **2 MiB** (≈2,8 MB de base64) para quedar por debajo del límite de 4,5 MB del cuerpo de las funciones de Vercel; el límite se aplica a la longitud del texto antes de decodificar. Usa la misma validación del servicio existente (tipo MIME, firma del archivo y tamaño).

## Conectar clientes

URL del endpoint: `https://www.silentium-hogar.com/api/mcp`. Crea antes un token en `/admin/agentes`. Guarda el token en una variable de entorno; no lo escribas en repositorios.

### Codex

En `~/.codex/config.toml`:

```toml
[mcp_servers.silentium]
url = "https://www.silentium-hogar.com/api/mcp"
bearer_token_env_var = "SILENTIUM_MCP_TOKEN"
```

```bash
export SILENTIUM_MCP_TOKEN="slm_…"
```

### Claude Code

```bash
claude mcp add --transport http silentium https://www.silentium-hogar.com/api/mcp \
  --header "Authorization: Bearer $SILENTIUM_MCP_TOKEN"
```

O en `.mcp.json` (la variable se expande al ejecutar, así el token no queda en el archivo):

```json
{
  "mcpServers": {
    "silentium": {
      "type": "http",
      "url": "https://www.silentium-hogar.com/api/mcp",
      "headers": { "Authorization": "Bearer ${SILENTIUM_MCP_TOKEN}" }
    }
  }
}
```

Comprueba con `/mcp`: un `401` indica token inválido, revocado o vencido.

### Claude Desktop

Los conectores remotos de Claude Desktop usan OAuth y no admiten una cabecera `Authorization` estática, así que se conecta mediante el puente `mcp-remote` (paquete de la comunidad, documentado en su README; verifica su versión vigente). La forma `Authorization:${VAR}` sin espacios es el rodeo que recomienda para Windows. En `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "silentium": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://www.silentium-hogar.com/api/mcp",
        "--transport",
        "http-only",
        "--header",
        "Authorization:${SILENTIUM_AUTH}"
      ],
      "env": { "SILENTIUM_AUTH": "Bearer slm_…" }
    }
  }
}
```

El token queda en la configuración local de Claude Desktop: protege ese archivo o usa un token de solo lectura.

## Notas operativas

- Aplicar la migración `20261111000000_mcp_access_tokens` antes de publicar; sin ella, la autenticación MCP y la pantalla de tokens fallan (`503`). Dev y producción comparten base de datos: no la apliques en pruebas locales sin autorización.
- Despliegue sin estado: cada petición crea un servidor y un transporte nuevos, sin sesiones ni SSE largos. `GET` y `DELETE` responden `405`.
- El cuerpo de las peticiones está limitado a 4 MB.
- Un agente puede equivocarse: prefiere tokens de solo lectura, vigencias cortas y revoca los que ya no uses. Las herramientas destructivas están anotadas para que el cliente pida confirmación, pero la decisión final es del cliente.
- El rol y el estado se reevalúan en cada llamada: no hace falta revocar tokens al degradar a una persona, aunque conviene hacerlo para mantener el listado limpio.

## Verificación

Pruebas unitarias en `src/domains/admin/mcp/`, `src/app/api/mcp/` y `src/app/api/admin/agent-tokens/` (incluida la eliminación de tokens revocados: condición atómica del borrado, 401/403/404/409, origen cruzado y botón solo en tokens revocados): entropía y hash del token, resolución de autorización (token ausente, mal formado, desconocido, revocado, caducado, usuario inactivo/bloqueado/eliminado, roles `support`/`customer`, solo cookies, cambio de rol entre dos llamadas), `initialize`/`tools/list`, lista de herramientas permitidas y patrón de herramientas prohibidas (incluidas `guide_*` y `store_overview`), `guide_*` contra el diccionario real (17 temas, búsqueda sin acentos, tema desconocido), `store_overview` con servicios simulados, instrucciones del servidor, `prompts/list` y `prompts/get` sobre Streamable HTTP, anotaciones, delegación al servicio con el actor, mapeo de errores y validación de subida base64 con el servicio real de medios. No se ejecutan pruebas de integración contra la base compartida.
