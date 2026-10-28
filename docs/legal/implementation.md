# Documentos y registro legal: operación y límites

Implementación autorizada el 28/10/2026. La publicación se tramita mediante PR y despliegue independiente de la migración; comprobar el estado del despliegue correspondiente al commit en main. No constituye certificación jurídica. Las obligaciones operativas de la titular no desaparecen por instalar controles.

## Qué incluye

- `/legal/terminos`, `/legal/privacidad`, `/legal/cookies`, `/legal/reembolsos`: contenido del diccionario, legible en HTML, navegación móvil, canónicas y sitemap público según la configuración SEO existente. Footer con documentos y enlace visible a SIC.
- Registro e invitaciones: términos, autorización de tratamiento y mayoría de edad separados y desmarcados; enlaces abren sin perder el formulario. Promociones del registro separadas, opcionales y por canal.
- `/account`: preferencias, retirada de todas las promociones sin nueva aceptación y descarga de evidencia propia. Usuarios anteriores no reciben aceptaciones retroactivas ni bloqueo de acceso.
- Detalle de usuario en administración: descarga de evidencia para el usuario seleccionado; API de exportación limitada a admin/superadmin activo y verificado. No concede gestión de usuarios a admin.
- Carrito: aviso y enlaces antes de salir a WhatsApp. Abrirlo no acepta un pedido ni publicidad. No se atribuye una aceptación web a quien únicamente consulta o abre un enlace.

## Evidencia y seguridad

`LegalRelease` conserva el contenido exacto de los cuatro documentos y etiquetas, idioma, versión, SHA-256 y fecha del servidor. `LegalConsentEvent` conserva sujeto, decisión individual, origen (`registration`, `invitation`, `account`), versión, fecha del servidor e identificador de operación. No recopila IP, contraseñas, tokens ni datos bancarios.

Registro y aceptación de invitación escriben las decisiones dentro de su transacción de negocio. Los reintentos no duplican eventos ni permiten cambiar el contenido de una misma operación. Cambiar el texto de una versión ya persistida falla: editar el diccionario requiere nueva versión en `legal_release.ts` y nueva revisión. Los props de formularios excluyen el texto completo de los documentos para no aumentar innecesariamente su carga.

Las tablas tienen RLS, sin permisos para `anon`/`authenticated`, y disparadores que impiden UPDATE/DELETE ordinarios. Esto no es un servicio notarial ni impide que un propietario de infraestructura modifique sus propios controles. La retención/eliminación legal justificada requiere un procedimiento privilegiado y auditado, no desactivar protecciones desde la aplicación. No se retiene todo para siempre por defecto.

Las preferencias y decisiones comparten bloqueo por identidad con la eliminación de cuenta. Se preservan guardas del último superadmin. La evidencia no se elimina en cascada al retirar preferencias/perfil. Sujeto de registro con correo aún sin verificar no equivale a identidad comprobada: la exportación distingue ese origen de una sesión verificada. Una fecha histórica sin versión no se convierte en prueba del contenido.

## Cómo consultar y retirar

1. Entra en **Mi cuenta → Privacidad y comunicaciones**.
2. Si lo deseas, acepta los documentos actuales; el consentimiento publicitario sigue siendo opcional. Una vez aceptados, cambiar promociones no exige aceptarlos de nuevo.
3. **Retirar todas las promociones** funciona sin marcar términos, privacidad o edad. Las solicitudes de supresión/revocación del tratamiento principal se atienden por el correo enlazado; no se confunden con baja publicitaria ni con eliminación de cuenta.
4. **Consultar o descargar mis aceptaciones** entrega JSON con eventos y contenido verificable. Para una reclamación, conservarlo íntegro y comprobar su hash; no editar la prueba.
5. Superadmin: **Usuarios → Ver detalle → Consultar o descargar mis aceptaciones** exporta el usuario seleccionado. La autorización se comprueba también en el servidor.

## Fuera del alcance automatizable de esta web

- En WhatsApp, antes de recoger datos y del pago, facilitar privacidad y dejar constancia de la autorización exigible, cotización completa, entrega y aceptación. Conservar conversación/confirmación de personalización y vincularla al pedido. La web no puede demostrar lo que alguien aceptó en una conversación externa que no recibe.
- Atender consultas y reclamaciones en plazos legales, coordinar devoluciones, cumplir garantías y revisar obligaciones fiscales. No se creó un sistema de facturación ni una pasarela.
- Concretar conservación por categoría, contratos con proveedores, medidas internacionales y procedimiento de incidentes con asesor colombiano. La ausencia de una indicación del contador no significa exención.
- Mantener evidencia de derechos de futuras fotos/proveedores. [Inventario de medios](media-inventory.json): procedencia y hashes no equivalen a cesión de derechos. La única foto actual del catálogo es ejemplo/ambientación, no fotografía acreditada de mercancía real.

## Cookies y publicidad

No se incorpora analítica ni píxeles de publicidad. No se añade un banner ficticio que acepte tratamientos inexistentes. Tema, autenticación, carrito y operaciones internas están informados en la política; los pedidos pendientes internos pueden contener datos personales. Antes de activar herramientas opcionales, auditar y bloquear lo que requiera autorización hasta una elección informada y revocable. Ver auditoría y comprobaciones reales de navegador al finalizar la verificación.

## Migración y pruebas

`20261028000000_legal_consent_evidence` está aplicada en la base compartida de desarrollo/producción: únicamente añade estructura privada. La aplicación utiliza estas tablas a partir del despliegue de este código; verificar primero la migración en cada entorno. No se añadieron aceptaciones de usuarios existentes.

- Jest normal: `npm run test`; validación de esquemas, formularios, trazabilidad, reintentos, retirada y permisos de API.
- PostgreSQL opcional: `LEGAL_INTEGRATION=1` con `npm run test:file -- src/domains/legal/services/consent_service.integration.test.ts`, usando explícitamente `.env.development`. Crea un sujeto ficticio dentro de una transacción y revierte todo; no crea usuarios en Auth, no envía correo y comprueba que el sujeto desaparece. Incluye restricciones SQL anónimas/autenticadas e inmutabilidad.
- La revisión de los `.borrador.md` sigue disponible como antecedente; el contenido servido y sus versiones viven en el diccionario y en los snapshots, no en esos Markdown.

## Comprobaciones de navegador realizadas el 28/10/2026

- Chrome: términos e identidad del vendedor, registro con cinco decisiones inicialmente desmarcadas y validación del formulario vacío; Mi cuenta muestra opciones a usuario existente sin fabricar aceptaciones. No se aceptaron contratos ni se alteraron preferencias de usuarios reales para probar.
- Navegador integrado limpio: registro y privacidad en móvil (375 px medidos, sin desbordamiento horizontal), navegación nativa entre documentos y cookies en escritorio; sin errores de consola en el registro. Chrome muestra un aviso de hidratación por atributos inyectados por extensiones (`speedupyoutubeads`, `cz-shortcut-listen`), ausente en el navegador limpio; no se suprimió el error ni se cambiaron extensiones.
- Producción visitada como invitado en navegador limpio: scripts del documento únicamente del mismo origen y sin iframes. Petición HTTP nueva a `/`: 200, sin `Set-Cookie`; `/sw.js`: 404. Esto no demuestra que ningún navegador antiguo conserve un service worker ni sustituye revisar cambios de paneles externos.
- No se pudieron enumerar cookies/almacenes del perfil mediante la interfaz de inspección disponible; se mantiene esa limitación en la auditoría. Los nombres y escritores están revisados en código, sin leer valores/tokens. La versión instalada de `@supabase/ssr` establece `maxAge` por defecto de 400 días; no hay sobreescritura local identificada. No confundir vida del token con duración de cookie.
- Fotos/fuentes: inventario con hashes y manifiestos de procedencia, licencias OFL y Pexels. La declaración de la titular no prueba derechos de cada foto futura de proveedor o exclusividad de imágenes generadas. No se presenta esa revisión como certificación de todos los derechos.

## Resultado de validación

- Suite completa: **158 suites y 930 pruebas correctas**, 13 suites/64 pruebas de integración opcional omitidas por diseño.
- Comprobación TypeScript y ESLint de los archivos modificados: correctas (solo aviso existente de `.eslintignore` obsoleto).
- Integración PostgreSQL específica: pasada con todos los datos ficticios revertidos; repetida correctamente tras el ajuste de creación concurrente del snapshot (`createMany` con `skipDuplicates`, sin UPDATE).
- Compilación de producción completada: TypeScript y 42 páginas estáticas correctas. Servidor compilado disponible en `http://localhost:3000`. Las cuatro páginas legales responden 200 con canónica correcta; las API privadas rechazan invitados con 401/no-store, y el registro rechaza privacidad ausente con 400 y origen ajeno con 403 antes de llamar a Auth. Registro compilado con cinco casillas desmarcadas y sin errores de consola en navegador limpio. Estas comprobaciones se hicieron antes de la publicación en Vercel; repetir el smoke test tras el despliegue.
