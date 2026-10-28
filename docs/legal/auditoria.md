# Brechas legales y plan técnico

**Revisión de código y procedencia a 27/10/2026. No certifica cumplimiento.** Esta sección registra la situación inicial antes de implementar. Actualización 28/10/2026: ver [implementación y límites](implementation.md) para los controles añadidos; no se modificaron proveedores ni aceptaciones históricas. Completar comprobación de producción y revisión jurídica antes de publicar políticas.

## 1. Hallazgos prioritarios

| Área                  | Evidencia actual                                                                                                                 | Acción pendiente                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro              | `register_form.tsx` usa un solo `acceptTerms` para términos y privacidad; marketing por correo/WhatsApp ya separado y desmarcado | Separar decisiones e información, enlaces y validación del servidor                                                                           |
| Persistencia          | `sync_auth_user.ts` deriva privacidad de la fecha de términos; `UserPreference` solo conserva fechas/booleanos                   | Evidencia independiente, versionada y recuperable; no equiparar dos consentimientos por compartir timestamp                                   |
| Invitaciones          | `invitation_acceptance.ts` también escribe ambas fechas desde una aceptación                                                     | Mismo modelo separado y verificable; no atribuir consentimiento al invitado antes de que actúe                                                |
| Usuarios existentes   | No hay prueba del contenido exacto mostrado en esos campos                                                                       | Conservar el dato histórico con sus límites; nuevas decisiones prospectivas, nunca rellenar versiones retrospectivas                          |
| Datos fuera del sitio | WhatsApp/Excel y compra concertada por conversación                                                                              | Inventariar accesos, finalidades, conservación y evidencia de cotización/aceptación; el registro web no prueba por sí solo el acuerdo externo |
| Cuenta                | Borrado coordina bloqueos y protección del último superadmin; no purga toda la historia de pedidos/proveedores                   | Explicar alcance real y conservar salvaguardas; no prometer borrado universal instantáneo                                                     |
| Identidad/comercio    | NIT recibido de la titular el 28/10/2026, sin consulta independiente; plazos/carriers/garantías por documentar                   | Completar información comercial; agregar acceso visible a SIC y constancias de pedidos/reclamaciones                                          |

Rutas de evidencia: `src/domains/auth/components/register_form.tsx`, `src/domains/auth/services/auth_schemas.ts`, `src/app/api/auth/register/route.ts`, `src/domains/auth/services/sync_auth_user.ts`, `src/domains/admin/users/services/invitation_acceptance.ts`, `src/domains/account/services/account_service.ts`, `prisma/schema.prisma`.

## 2. Formularios: no aplicar casillas indiscriminadamente

| Flujo                                                  | Diseño propuesto, aún no implementado                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Registro y aceptación de invitación                    | Términos y autorización de tratamiento separadas, desmarcadas y enlazadas; finalidad y necesidad explícitas                              |
| Promociones                                            | Correo y WhatsApp opcionales e independientes; baja accesible y registro de retirada                                                     |
| Cotización/pedido por WhatsApp                         | Avisos accesibles y evidencia del resumen/precio/entrega/personalización y aprobación; no presumir que abrir WhatsApp acepta un contrato |
| Perfil y nuevas finalidades                            | Informar y pedir autorización cuando corresponda; no exigir todo de nuevo para cualquier edición                                         |
| Login, recuperación, seguridad y ejercicio de derechos | No imponer nueva aceptación comercial ni marketing como condición de acceso o reclamación                                                |
| Formularios internos de administración                 | Permisos, minimización y trazabilidad del operador; una casilla del empleado no sustituye la autorización del cliente                    |

Revisar todos los flujos antes de programar. Comprobar accesibilidad móvil, enlaces que no pierdan datos y errores independientes. El requisito de mayoría de edad necesita controles coherentes de interfaz/servidor; no está acreditado por escribirlo en una política.

## 3. Evidencia de aceptación y retirada

Propuesta para diseñar después de aprobar los textos:

- Documento inmutable por versión: tipo, identificador, idioma, contenido exacto y hash. La fecha de borrador no es vigencia.
- Evento con sujeto/vinculación, acción afirmativa específica, versión mostrada, finalidad/canal, formulario/origen y fecha del servidor; decisiones independientes.
- Retirada, actualización y sustitución como eventos posteriores, sin reescribir la evidencia previa. No inventar autorizaciones antiguas.
- Validación del servidor; una marca enviada por el navegador no demuestra qué texto sirvió el servidor. Reintentos idempotentes y rechazo de versiones no vigentes según política aprobada.
- Acceso restringido, historial protegido contra alteración, exportación verificable para atención de titulares/autoridad, conservación justificada y respuesta ante incidentes.
- Minimizar identificadores: IP/user-agent solo si hay necesidad y fundamento documentados, no recolectarlos automáticamente «por si la SIC pregunta». Evitar tokens, contraseñas y documentos de identidad en logs.
- Reconciliar eliminación de cuentas con pruebas y retención legal; mantener `lockUserAccess`, `lockUserIdentity` y guardas del último superadmin.

Pruebas futuras: checkboxes vacías/separadas, rechazo de cada aceptación faltante donde corresponda, marketing opcional, contenido/versiones, concurrencia/reintentos, invitaciones, baja, acceso no autorizado y recuperación/exportación de evidencia. No ejecutar borrados de cuentas reales: desarrollo y producción comparten base.

## 4. Cookies, proveedores y conservación

El [inventario provisional](cookies.borrador.md) cubre tema, Auth, carrito y operaciones internas. **Los pedidos pendientes en sessionStorage pueden contener datos de clientes**: no son solo identificadores técnicos. Revisar limpieza y riesgo en dispositivos compartidos.

No se detectaron integraciones de analítica/publicidad en el código revisado; pendiente comprobar tráfico y configuración externa. La configuración `next-pwa` no demuestra un service worker activo ni que las cachés privadas sean seguras. No se inspeccionaron ni guardaron tokens.

| Circuito conocido                                                         | Revisión operativa pendiente                                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Vercel; Supabase Auth/Postgres/Storage, infraestructura principal Irlanda | Contratos aplicables, subencargados, ubicaciones, logs, backups y retención efectiva               |
| Resend mediante SMTP de Supabase; Cloudflare Email Routing y Gmail        | Encargos, datos en correos, acceso al buzón, conservación y tratamiento internacional              |
| WhatsApp; medios de pago externos; transportadoras; Excel                 | Inventario de datos/encargados, seguridad, finalidades, destinatarios y evidencias de autorización |

No toda operación internacional es jurídicamente una transferencia: distinguir transmisión a un encargado y otros destinatarios, con asesor. Los DPA publicados por [Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum), [Vercel](https://vercel.com/legal/dpa) y [Resend](https://resend.com/legal/dpa) son referencias, no prueba de contratación ni de cumplimiento completo.

Definir tabla de conservación: categoría, finalidad, fundamento, plazo/criterio, responsable, bloqueo, eliminación/anonimización y tratamiento de copias. La titular no recibió indicaciones del contador: eso no autoriza borrar obligaciones ni conservar todo indefinidamente. Revisar RNBD según sujeto y condiciones reales.

Para promociones: autorización específica, baja, horarios y límites de contacto de Ley 2300 (hora Colombia), revisión del RNE e instrucciones vigentes antes de campañas. No importar contactos antiguos de WhatsApp/Excel como suscriptores por defecto.

## 5. Imágenes, marca y fuentes

**Resultado: procedencia parcialmente documentada, no derechos exclusivos de todos los recursos verificados.** La declaración de la titular sobre fotos propias no convierte los recursos del desarrollo en fotografías suyas.

| Recurso                                                                         | Evidencia y límite                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/brand/{wordmark,signature,isotype}.svg` e iconos derivados              | `public/brand/provenance.json`: vectores de página 3 de `docs/BRIEF.pdf`; conservar declaración/cesión o permiso del creador. El archivo fuente no prueba registro de marca o cesión                                                                           |
| `refugio-marfil.webp`, `entre-telas-room-*`, `entre-telas-curtain-*`            | `public/images/landing/provenance.json`: generación/edición con image_gen y prompts. Ambientación, no fotografías de SKU; no prometer autoría humana o exclusividad por generarlas                                                                             |
| `story-white-bedding.jpg`                                                       | Pexels 9893931, Ofir Eliav; [fuente](https://www.pexels.com/photo/white-bed-linen-and-pillows-9893931/) y licencia en provenance                                                                                                                               |
| `story-bedroom.jpg`                                                             | Pexels 13158870, Andrea Davis; [fuente](https://www.pexels.com/photo/a-white-linen-with-pillows-on-the-bed-near-the-wooden-table-13158870/) y licencia en provenance                                                                                           |
| Foto del producto de ejemplo, `textiles-8251700.jpg` en `catalog-public-images` | Pexels 8251700, PNW Production según manifiesto/script de preparación; [fuente](https://www.pexels.com/photo/white-linen-covering-a-bed-with-pillows-8251700/). Demostración, no foto del proveedor o mercancía real; sustituir antes de vender esa referencia |
| Cormorant Garamond y Manrope locales                                            | `src/styles/fonts/README.md` y archivos OFL adyacentes; mantener licencias en distribuciones. No se usa Catchye/Nudista como fuente web; logo es contorno del brief                                                                                            |

La [licencia Pexels](https://www.pexels.com/license/) permite uso y modificación sin atribución obligatoria, con límites como no implicar respaldo de personas/marcas ni redistribuir como banco. No acredita que el producto fotografiado sea el vendido. Conservar por activo fuente, autor, licencia/fecha, permiso cuando corresponda y uso previsto. Verificar también derechos de terceros que pudieran aparecer.

Para la imagen de catálogo, recuperar el manifiesto del artefacto de desarrollo `demo-photos/provenance.json`; el script local `prepare-demo-photos.cjs` identifica origen y autor pero no sustituye conservar licencia/evidencia. No se hizo extracción completa de Storage ni inspección de cada recurso remoto en esta fase. Verificar inventario final al publicar y cada futura subida de proveedores.

La [DNDA](https://www.derechodeautor.gov.co/es/pronunciamientos-sobre-ia) distingue protección de aportes humanos y contenido generado por IA; conservar procedencia no equivale a demostrar derechos exclusivos. Mantener ambiente ilustrativo separado de fotografía de producto.

## 6. Orden de ejecución y comprobación

1. Con el NIT ya facilitado, titular y asesor cierran fiscalidad, garantías y logística; aprueban textos sin marcadores, finalidades y conservación.
2. Completar inventario de producción y medios, contratos y procesos fuera de web. Corregir afirmaciones comerciales que no puedan acreditarse.
3. Diseñar e implementar documentos públicos legales, enlaces/avisos, controles por flujo y registro protegido de decisiones. Los borradores no se sirven ni indexan. Mantener la información general de marca/contacto en la landing.
4. Implementar baja/ejercicio de derechos y exportación de prueba, con permisos y retención. Añadir bloqueo de rastreadores opcionales solo si se incorporan y corresponde autorización.
5. Probar servidor, interfaz móvil/escritorio, invitaciones y usuarios existentes, ausencia de datos privados en cachés y recuperación de evidencia; luego aprobación y publicación versionada.

## Fuentes y cautelas de vigencia

- [Ley 1480 compilada en DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1480_2011.htm): identidad e información, garantía, retracto, comercio electrónico y reclamación. Texto incluye modificaciones de Ley 2439 de 2024; no copiar plazos anteriores de devolución.
- [Ley 1581 compilada en Cancillería](https://cancilleria.gov.co/normograma/compilacion/docs/ley_1581_2012.htm): autorización, derechos, consultas/reclamos y obligaciones. Complementar con Decreto 1074 de 2015, capítulo 25.
- [Ley 2300](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=213990) y [Circular SIC 001 de 2024](https://sedeelectronica.sic.gov.co/sites/default/files/normativa/Circular%20No.001%20Poteccio%CC%81n%20Datos%20Personales_260724.pdf): contacto comercial y RNE; revisar supuestos concretos. No trasladar instrucciones sectoriales de fintech a esta tienda sin fundamento.
- [DIAN: obligados a facturar](https://www.dian.gov.co/impuestos/sociedades/Paginas/obligadosfacturar.aspx): determinar obligación con contador; desconocerla no implica exención.

Los borradores no reemplazan asesoría jurídica ni garantizan una respuesta favorable de la SIC. Verificar nuevamente vigencia y requisitos antes de convertirlos en políticas públicas.
