# Autorización OAuth 2.1 para el MCP de administración

Cualquier agente compatible con MCP (Codex, ChatGPT, claude.ai y Claude Desktop, Claude Code, Cursor, VS Code, MCP Inspector…) puede conectarse a `POST /api/mcp` iniciando sesión como administrador, sin copiar tokens. La propia aplicación actúa como **servidor de autorización**; `/api/mcp` es el **servidor de recursos**. Los tokens personales `slm_…` (`docs/admin-mcp.md`) siguen funcionando sin cambios.

**Revisión de la especificación implementada: MCP Authorization `2026-07-28`** (la vigente en modelcontextprotocol.io al desarrollar esta función), que se apoya en OAuth 2.1 (draft-ietf-oauth-v2-1-13), RFC 9728 (Protected Resource Metadata), RFC 8414 (Authorization Server Metadata), RFC 8707 (Resource Indicators), RFC 7636 (PKCE), RFC 7591 (Dynamic Client Registration), RFC 7009 (revocación), RFC 9207 (parámetro `iss`) y OAuth Client ID Metadata Documents (draft-ietf-oauth-client-id-metadata-document-00). No se implementa el servidor OAuth de Supabase ni OpenID Connect (no hay ID tokens).

## Endpoints

Todos derivan del origen público de confianza: `APP_PUBLIC_URL` (o `VERCEL_PROJECT_PRODUCTION_URL`, o el origen canónico `https://www.silentium-hogar.com` de `seo_rules.ts`). La cabecera `Host` **solo** se usa en desarrollo local explícito: `NODE_ENV=development` (`next dev`), host `localhost`, `127.0.0.1` o `[::1]` y `VERCEL_ENV` distinto de `production`. En cualquier otro modo (`next start`, previews, pruebas, `NODE_ENV` sin definir o autoalojado) se exige el origen configurado; sin configuración se usa el canónico. Por eso la prueba manual local (D6/D7/D8) se hace con `npm run dev` / `npx next dev -p 3124`, no con `next start` (ahí el emisor sería el origen público). Cubierto por `oauth_discovery.test.ts` (`trusted origin`).

| Endpoint | Ruta | Sesión | CORS |
| --- | --- | --- | --- |
| Recurso protegido (MCP) | `POST /api/mcp` | Bearer | sí |
| Protected Resource Metadata | `/.well-known/oauth-protected-resource` y `/.well-known/oauth-protected-resource/api/mcp` | no | sí |
| Authorization Server Metadata | `/.well-known/oauth-authorization-server` (alias `/.well-known/openid-configuration`, mismo documento, sin ID tokens) | no | sí |
| Registro dinámico (RFC 7591) | `POST /api/oauth/register` | no | sí |
| Autorización + consentimiento | `GET /oauth/authorize` (pantalla) y `POST /api/oauth/authorize` (decisión) | cookies de la sesión normal | no |
| Token | `POST /api/oauth/token` | no | sí |
| Revocación (RFC 7009) | `POST /api/oauth/revoke` | no | sí |

- El `resource` (RFC 8707) canónico es `<origen>/api/mcp`. El `issuer` es el origen sin ruta ni barra final.
- Un `401` de `/api/mcp` incluye `WWW-Authenticate: Bearer realm="silentium-admin", resource_metadata="<origen>/.well-known/oauth-protected-resource/api/mcp", scope="read"` (más `error="invalid_token"` cuando se envió un token inválido) y expone esa cabecera por CORS. `OPTIONS` se responde antes de autenticar.
- El middleware de sesión excluye `/.well-known/*`, `/api/mcp`, `/api/oauth/register`, `/api/oauth/token` y `/api/oauth/revoke`: ninguno usa cookies. `/oauth/authorize` y `POST /api/oauth/authorize` sí pasan por la sesión normal. Las rutas `/oauth` y `/api` son `noindex`.
- Metadatos: `code_challenge_methods_supported: ["S256"]`, `grant_types_supported: ["authorization_code","refresh_token"]` (sin implícito ni password), `response_types_supported: ["code"]`, `scopes_supported: ["read","write"]`, `token_endpoint_auth_methods_supported: ["none","client_secret_basic","client_secret_post"]`, `client_id_metadata_document_supported: true`, `authorization_response_iss_parameter_supported: true`.

## Flujo

1. El cliente llama a `/api/mcp` sin token → `401` con `resource_metadata`.
2. Lee la metadata del recurso (`authorization_servers` = el origen) y la del servidor de autorización.
3. Obtiene un `client_id`: **CIMD** (un `client_id` que es una URL `https://…` con un documento JSON) o **DCR** (`POST /api/oauth/register`).
4. Abre `/oauth/authorize?response_type=code&client_id=…&redirect_uri=…&code_challenge=…&code_challenge_method=S256&state=…&resource=<origen>/api/mcp`.
5. Si no hay sesión, se envía a `/login?returnTo=<la misma solicitud>` y vuelve. Si la cuenta no es `admin`/`super_admin` activa se muestra un rechazo claro (sin redirigir al cliente).
6. La pantalla de consentimiento muestra el cliente, su URI y la dirección de retorno, y **la persona elige «Solo lectura» o «Lectura y escritura»**. Aprobar redirige con `code`, `state` y `iss`; cancelar con `error=access_denied`.
7. El cliente canjea el código en `/api/oauth/token` (`code_verifier`, `redirect_uri`, `resource`) y recibe `access_token` (1 h), `refresh_token` y `scope`.
8. Cada hora el cliente usa `grant_type=refresh_token`; a los 90 días, o tras revocar, la persona debe autorizar de nuevo.

### Registro de clientes

- **CIMD** (preferido por la especificación): el `client_id` es una URL `https` con ruta, sin fragmento, credenciales ni puerto y con nombre DNS (no IP ni host de una sola etiqueta). El documento debe ser JSON ≤ 16 KB, con `client_id` idéntico a la URL, `client_name` (obligatorio en la revisión 2026-07-28; en DCR sigue siendo opcional), `redirect_uris` válidas y que pueda autenticarse como cliente público: `token_endpoint_auth_method` ausente o `none`, o `none` incluido en `token_endpoint_auth_methods_supported` (ChatGPT declara `private_key_jwt` pero también admite `none`; el servidor no verifica aserciones firmadas y registra siempre los clientes CIMD como públicos con PKCE). Los `grant_types`/`response_types` adicionales declarados por el cliente (p. ej. `urn:ietf:params:oauth:grant-type:jwt-bearer`) se ignoran; solo se exige que incluyan `authorization_code` y `code`. Si un cliente público envía en `/api/oauth/token` una `client_assertion` JWT sin `client_id`, se usa su `sub` solo para identificarlo (sin verificar la firma, que no añade seguridad sobre PKCE); un cliente confidencial nunca se autentica así. Los fallos de descarga se registran como `mcp_oauth_client_metadata_failed` con un código fijo (`cimd_bad_response`, `cimd_invalid_document`, `cimd_timeout`…). Solo se descarga **después** de que el administrador inició sesión en la pantalla de autorización. Protecciones SSRF: solo `https`, IPs públicas comprobadas en la propia conexión (el `lookup` DNS protegido responde en formato arreglo cuando Node >= 20 lo pide con `{ all: true }` y valida **todas** las direcciones resueltas; sin ventana de _DNS rebinding_ entre comprobar y conectar), sin reutilizar sockets ni seguir redirecciones, 5 s de plazo y 16 KB. La copia se guarda según `Cache-Control` (entre 5 min y 24 h; 1 h por omisión); si el refresco falla se sigue usando la última copia validada.
- **DCR** (obsoleto en la especificación, se mantiene por compatibilidad): cuerpo JSON ≤ 16 KB; `redirect_uris` (1–5) con las reglas de abajo; nombre ≤ 100 caracteres; `grant_types` ⊆ {`authorization_code`,`refresh_token`}, `response_types` = `code`; `token_endpoint_auth_method` `none` (por omisión, a diferencia de RFC 7591 que asume `client_secret_basic`, porque los clientes MCP son públicos y usan PKCE), `client_secret_basic` o `client_secret_post` (se emite un `client_secret` una sola vez; solo se guarda su hash). Los miembros desconocidos se ignoran.
- **Límites de abuso del registro dinámico** (endpoint abierto, así que ningún límite puede dejar a clientes legítimos fuera): (1) _por origen_: como máximo 20 registros sin usar por hora y red, con respuesta `429`; la red es la IPv4 o el /64 de la IPv6 de `x-real-ip` / primer salto de `x-forwarded-for` (que Vercel sobrescribe) y solo se guarda un HMAC-SHA256 con clave derivada (separación de dominio) de `SUPABASE_SECRET_KEY`, nunca la IP, en `McpOAuthClient.registrantHash`; se borra en cuanto el cliente se autoriza y, sin secreto o sin dirección, solo rigen los límites globales; (2) _purga rápida_: antes de cada registro se eliminan los clientes sin ninguna conexión ni código vivo con más de 2 h; (3) _techo global_ de 5000 registros sin usar: al alcanzarlo se **expulsan los más antiguos** en lugar de rechazar registros nuevos. Un atacante solo puede desplazar registros ajenos sin usar si supera 5000 en menos de 2 h, y por origen está limitado a 20/h. En un autoalojado sin proxy de confianza las cabeceras de reenvío se pueden falsear: entonces el techo global es la última defensa. Además: máximo 500 clientes CIMD y 25 conexiones activas por persona. No hay limitación de tasa distribuida general (fuera de alcance, como en los tokens personales).
- El nombre y el URI de un cliente son **declarados por él mismo**: la pantalla siempre los marca como «Sin verificar» y muestra el host de la dirección de retorno (advirtiendo cuando solo apunta a `localhost`).

### Reglas de `redirect_uri`

Solo `https`, o `http` en bucle local (`localhost`, `127.0.0.1`, `[::1]`) para clientes nativos; sin fragmentos ni credenciales; ≤ 512 caracteres. La coincidencia con lo registrado es **exacta**, salvo que en URIs `http` de bucle local puede variar el puerto (RFC 8252 §7.3). Una solicitud con `client_id` o `redirect_uri` no confiables muestra un error y **nunca** redirige; el resto de errores (`invalid_request`, `invalid_target`, `unsupported_response_type`, `access_denied`) se devuelven a la `redirect_uri` ya validada con `state` e `iss`.

**Limitación conocida:** los clientes que usan esquemas propios (`cursor://…`, `vscode://…`) no pueden registrarse (la especificación exige `https` o `localhost`). Para esos casos usa un token personal (`docs/admin-mcp.md`) o un cliente que use `https`/bucle local.

### Recurso (RFC 8707) y audiencia

Si el cliente envía `resource`, debe identificar este servidor: `<origen>/api/mcp` (o el origen solo, que se acepta por tolerancia; se ignoran mayúsculas en esquema y host y la barra final). Otro valor → `invalid_target`. Si falta (clientes antiguos) se asume el recurso canónico. El token queda ligado a ese recurso y `/api/mcp` rechaza (`401 invalid_token`) los tokens de otro recurso.

## Tokens y ciclo de vida

| Elemento | Formato | Vida |
| --- | --- | --- |
| Código de autorización | `slc_` + 256 bits (base64url) | 10 min, un solo uso |
| Token de acceso | `sla_` + 256 bits | 1 hora (nunca más allá de la conexión) |
| Token de renovación | `slr_` + 256 bits | hasta el fin de la conexión |
| Conexión (grant) | — | 90 días desde la autorización; luego hay que autorizar de nuevo |

- Solo se guarda el hash SHA-256 de cada secreto (códigos, accesos, renovaciones, secretos de cliente). El texto plano solo existe en la respuesta HTTP; nunca se registra ni se lista.
- **Canje del código:** el código pertenece a un cliente, una `redirect_uri`, un recurso y un desafío PKCE (solo `S256`). Se comprueban cliente, `redirect_uri` exacta, verificador PKCE y recurso antes de consumirlo de forma atómica; reutilizar un código ya canjeado falla y **revoca la conexión** que produjo. Si la cuenta ya no es administradora activa, falla.
- **Renovación con rotación:** cada uso consume atómicamente el token de renovación y emite uno nuevo y un acceso nuevo. Presentar un token ya rotado se trata como robo y **revoca toda la conexión** (acceso y renovación). Los tokens rotados **se conservan (solo su hash) hasta que la conexión se elimina**, de modo que reutilizar cualquiera, por antiguo que sea, revoca la conexión (D4); el crecimiento está acotado por la propia conexión: como mucho una renovación por hora durante 90 días (≈ 2200 filas por conexión, máx. 25 conexiones activas por persona) y se borran en cascada 30 días después de que la conexión venza o se revoque. El alcance no puede ampliarse (`invalid_scope`).
- **Alcances:** los decide la persona en la pantalla de consentimiento, no el cliente. `read` o `read`+`write`; el alcance pedido por el cliente solo es una pista visual. Los tokens OAuth resuelven al mismo actor (`McpActor`) que los personales: la lista de herramientas, el control de alcance en cada llamada, el rol/estado del propietario releídos en **cada** petición (`401` token inválido/vencido/revocado; `403` propietario sin rol o inactivo) y el registro de auditoría son idénticos.
- **Revocación:** en `/admin/agentes` → «Conexiones de agentes» (cliente, permisos, creada, último uso, vencimiento y estado). **Revocar** marca la conexión y mata el acceso y la renovación al instante (cada petición y cada renovación consultan la conexión). **Eliminar** solo está disponible para conexiones ya revocadas (la condición va en el propio `DELETE`). `POST /api/oauth/revoke` (RFC 7009) revoca la conexión de un token del propio cliente.
- **Limpieza de caducados:** sin planificador; `issueAuthorizationCode` (infrecuente y autenticado) elimina códigos con más de 24 h, conexiones vencidas o revocadas hace más de 30 días (sus tokens se borran en cascada) y accesos caducados; la renovación poda solo sus propios accesos caducados (nunca las renovaciones rotadas); el registro elimina clientes abandonados (ver límites de abuso).

## Seguridad

- **CSRF del consentimiento:** `POST /api/oauth/authorize` exige sesión de administrador, cabecera `Origin` idéntica al origen de la petición, cuerpo `application/json` (un formulario entre sitios no puede enviarlo sin un _preflight_ CORS que la ruta nunca concede) y rechaza `Sec-Fetch-Site: cross-site`. La decisión **revalida toda la solicitud** (cliente, `redirect_uri`, PKCE, recurso); nada del formulario se confía. La pantalla navega al `redirectTo` devuelto por el servidor desde el cliente, de modo que la CSP no restringe el destino.
- **Tablas privadas:** `McpOAuthClient`, `McpOAuthCode`, `McpOAuthGrant` y `McpOAuthToken` con RLS activado y `REVOKE ALL … FROM PUBLIC, anon, authenticated`, más restricciones `CHECK` (hash SHA-256 de 64 hex, tamaños, alcances 1–2, caducidad posterior a la creación, secreto de cliente coherente con su método).
- Tokens de cookies nunca se aceptan en `/api/mcp`; los endpoints públicos no leen cookies. CORS `*` es seguro porque la única credencial va en la petición (Bearer o secreto de cliente), nunca en cookies.
- Los registros solo contienen nombres de evento (`mcp_oauth_*_failed`), nunca tokens, códigos, secretos ni hashes.

## Migración

`prisma/migrations/20261112000000_mcp_oauth/migration.sql` (aditiva; tablas nuevas, sin tocar las existentes) y `prisma/migrations/20261113000000_mcp_oauth_registrant/migration.sql` (añade `McpOAuthClient.registrantHash`, su restricción e índice; es una migración aparte para que sea segura aunque la primera ya estuviera aplicada). Dev y producción comparten base de datos: aplícala con `prisma migrate deploy` **solo** tras confirmar con `prisma migrate status` que son las únicas pendientes, y antes de publicar; sin ella los endpoints OAuth responden `503` y `/admin/agentes` no lista conexiones (los tokens personales siguen funcionando).

## Cómo conectar cada cliente

URL del servidor MCP: `https://www.silentium-hogar.com/api/mcp` (en local, `http://localhost:3124/api/mcp`). Inicia sesión como administrador cuando el navegador lo pida y elige los permisos. Las pantallas y comandos de cada producto cambian con frecuencia: consulta su documentación vigente; lo que sigue es lo que la implementación necesita y lo habitual.

- **ChatGPT / Codex web (conectores):** añade un conector / servidor MCP remoto con esa URL (modo desarrollador o ajustes de conectores, según el plan) y elige OAuth. Usan CIMD con `client_id=https://chatgpt.com/oauth/client.json` y vuelven a `https://chatgpt.com/connector_platform_oauth_redirect`; su documento se valida en `oauth_rules.test.ts` con el contenido real.
- **claude.ai / Claude Desktop:** _Ajustes → Conectores → Añadir conector personalizado_, pega la URL y autoriza. Claude usa CIMD (anunciamos `client_id_metadata_document_supported` y `none`) o, si no, DCR, y vuelve a `https://claude.ai/api/mcp/auth_callback`. Claude Code usa `https://claude.ai/oauth/claude-code-client-metadata` con `http://localhost/callback` y `http://127.0.0.1/callback` en puertos variables (coincidencia sin puerto). Claude exige `401` con `resource_metadata` para iniciar el acceso, respuestas en menos de 10 s (30 s en renovaciones), `invalid_grant` cuando un refresh deja de valer y `application/x-www-form-urlencoded` en `/api/oauth/token`; todo ello se cumple. Los permisos que faltan se devuelven hoy como error de herramienta, no como `403 insufficient_scope`, así que Claude no ofrece ampliar permisos automáticamente: hay que reconectar con «Lectura y escritura».
- **Claude Code:** `claude mcp add --transport http silentium https://www.silentium-hogar.com/api/mcp`; luego `/mcp` → _silentium_ → _Authenticate_ (abre el navegador).
- **Cursor:** `.cursor/mcp.json` con `{"mcpServers":{"silentium":{"url":"https://www.silentium-hogar.com/api/mcp"}}}`. Si el cliente usa una redirección con esquema propio, no puede registrarse (ver limitación); usa un token personal con cabecera.
- **VS Code:** `.vscode/mcp.json` con `{"servers":{"silentium":{"type":"http","url":"https://www.silentium-hogar.com/api/mcp"}}}` y arranca el servidor desde el editor.
- **MCP Inspector:** `npx @modelcontextprotocol/inspector`, transporte _Streamable HTTP_, URL del MCP, _Open Auth Settings_ → _Quick OAuth Flow_ (o paso a paso: metadatos → registro → autorización → token) y luego _Connect_.
- **Codex CLI:** además del token personal (`bearer_token_env_var`), las versiones con soporte OAuth para MCP remotos pueden iniciar sesión con `codex mcp login silentium`; verifica la versión instalada.

## Verificación

Pruebas unitarias (la base de datos se simula en memoria con `src/domains/admin/mcp_oauth/testing/fake_db.ts`; ninguna toca la base real): `oauth_rules.test.ts` (PKCE con el vector de RFC 7636, redirect URIs, recurso, CIMD/SSRF), `oauth_discovery.test.ts` (D1, origen de confianza), `oauth_cimd.test.ts` (lookup protegido con la pila real de `net`/`http`, con y sin `autoSelectFamily`, descarga de documentos y `client_name` obligatorio), `oauth_registrant.test.ts` y `oauth_registration_limits.test.ts` (límites de registro), `oauth_dictionary.test.ts` (diccionario proyectado), `oauth_flow.test.ts` (registro DCR/CIMD, validación de autorización, canje de códigos, rotación y reutilización incluso de tokens muy antiguos, 90 días con reloj falso, revocación RFC 7009), `src/app/api/mcp/route.oauth.test.ts` (desafío 401, CORS, audiencia, vencidos, revocados, rol/estado, alcances), `src/app/api/oauth/authorize/route.test.ts` (consentimiento, CSRF, límites), `src/app/api/admin/agent-connections/route.test.ts` y los componentes `oauth_consent_screen`/`oauth_connections_section`.

### Prueba manual de extremo a extremo (local)

1. Aplicar la migración a la base de desarrollo **solo con autorización** (`prisma migrate status` debe mostrar solo `20261112000000_mcp_oauth` y `20261113000000_mcp_oauth_registrant` pendientes (o solo la segunda si la primera ya se aplicó)).
2. Desde el worktree: `npx next dev -p 3124` (modo desarrollo: necesario para que el emisor siga la petición `localhost`).
3. `curl -i http://localhost:3124/.well-known/oauth-protected-resource/api/mcp`, `curl -i http://localhost:3124/.well-known/oauth-authorization-server` y `curl -i -X POST http://localhost:3124/api/mcp` (esperado `401` con `resource_metadata`).
4. Conectar MCP Inspector (o `claude mcp add --transport http silentium-local http://localhost:3124/api/mcp` y `/mcp`), iniciar sesión como administrador, elegir permisos y comprobar `tools/list`, una lectura (`guide_search`, `store_overview`) y la renovación.
5. En `/admin/agentes` comprobar la conexión, revocarla (el cliente recibe `401` y la renovación falla) y eliminarla.
