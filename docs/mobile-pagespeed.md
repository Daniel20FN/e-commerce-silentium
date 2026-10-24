# Carga inicial móvil sin cambiar la landing

Se conserva el hero «Entre telas», sus fotografías, el slogan, las animaciones y ambos temas. Estas mejoras atienden el informe de PageSpeed de la portada; no equivalen a una puntuación nueva ya desplegada.

## Referencia

[Informe del 24 de octubre de 2026](https://pagespeed.web.dev/analysis/https-www-silentium-hogar-com/98fpkmuj1b?form_factor=mobile):

| Categoría        | Móvil | Escritorio |
| ---------------- | ----- | ---------- |
| Rendimiento      | 78    | 97         |
| Accesibilidad    | 100   | 100        |
| Buenas prácticas | 96    | 96         |
| SEO              | 100   | 100        |

Móvil simulado Moto G Power/4G lenta: FCP 0,9 s, LCP 5,4 s, TBT 20 ms, CLS 0. No hay datos de usuarios reales. El desglose de recursos no debe sumarse al LCP simulado: son mediciones diferentes.

## Cambios y límites

| Problema                                                     | Solución                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La cortina LCP solo se descubre al leer CSS                  | Precarga de imagen con prioridad alta, restringida a móviles y con el mismo selector 1x/2x que `image-set`. No descarga la cortina en escritorio.                                                                                       |
| Foto móvil del hero enviada directamente                     | `getImageProps` genera variantes optimizadas de la misma fotografía. `picture` conserva una sola imagen según el dispositivo.                                                                                                           |
| Fotografías de categorías sin optimizar                      | Se habilita Next Image con `sizes` ajustado a la cuadrícula. Se mantiene la recuperación ilustrativa ante error.                                                                                                                        |
| Dos hojas CSS pequeñas bloquean el primer pintado            | `experimental.inlineCss` entrega el CSS con el HTML en producción. MUI ya inserta sus estilos mediante `AppRouterCacheProvider`, que se conserva.                                                                                       |
| JavaScript innecesario en todas las páginas                  | Se elimina el proveedor de calendarios sin consumidores. Las reglas compartidas del carrito usan `zod/mini`, sin quitar límites, tipos ni rechazo de campos extra. No se añaden dependencias.                                           |
| React #418 al resolverse la sesión antes de hidratar el menú | `useHydrated` estabiliza el primer render del menú y del drawer. Dos pruebas SSR/hidratación reproducen la carrera para invitados y usuarios.                                                                                           |
| Un visitante normal genera `session_expired`                 | `/api/auth/me` es descubrimiento opcional: devuelve `200 { data: { user: null } }` sin sesión. Sigue sin caché, limpia cookies obsoletas y conserva errores inesperados `500`. Los endpoints protegidos siguen rechazando al visitante. |
| Animaciones innecesariamente retenidas                       | Las entradas finitas liberan su estado al terminar; el texto usa transformación 3D y el indicador del menú no anima el trazo. Se mantiene movimiento reducido.                                                                          |

La precarga de la cortina debe actualizarse junto al `image-set` si cambian sus archivos. No precargar todas las imágenes ni quitar sus capas para falsear la nota.

`inlineCss` es experimental y global: evita viajes de red a cambio de repetir CSS en cada HTML y perder su caché independiente. En esta portada el informe muestra aproximadamente 6 KiB transferidos de CSS externo. Si crece mucho el CSS, revisar ese intercambio y comparar visitas frías/calientes antes de conservarlo. En desarrollo el ajuste no se aplica: probar el build real.

## Verificación

1. Ejecutar Jest, tipos, lint de los cambios y build; no generar Prisma mientras corre Jest/Next en Windows.
2. Probar el build en Chrome como invitado y con sesión existente: recarga directa, menú, carrito persistido, fichas, variantes, filtros, galería y navegación entre rutas/anclas.
3. Confirmar que la portada incluye la precarga móvil y estilos inline; comprobar visualmente móvil, tablet, escritorio y movimiento reducido. Confirmar que no hay errores de hidratación.
4. Medir los recursos públicos antes/después: mismos tipos de respuesta y suma de scripts iniciales. Los bytes descomprimidos o estimaciones gzip no son latencia ni la puntuación Lighthouse.
5. Después de publicar, repetir PageSpeed varias veces en móvil y comparar la mediana. Revisar también catálogo, categoría y producto; este informe solo cubre `/`.

No se modifica stock, pedidos, precios, usuarios ni Storage para estas pruebas. No ocultar errores reales, desactivar autenticación ni servir datos privados desde una caché compartida para mejorar la puntuación.

## Resultados locales comprobados

- El build de producción y sus tipos compilan. La suite completa pasó 145 suites/846 pruebas; las 12 suites de integración con escritura permanecen omitidas por defecto (63 pruebas). No se ejecutaron contra la base compartida.
- Las dos regresiones del menú fallan sin el cambio y pasan con él: se simula que la sesión termina entre SSR e hidratación, tanto con invitado como con usuario.
- La respuesta HTML del build contiene una sola precarga responsive de cortina y cero enlaces a hojas CSS externas. La compresión/caché de imágenes sigue independiente del HTML.
- Portada anterior desplegada: 25 scripts iniciales, 1.402.351 bytes descomprimidos (estimación gzip: 418.980). Build local final: 24 scripts, 1.375.308 bytes (estimación gzip: 406.332). No son bytes de transferencia reales ni una nota PageSpeed.
- La fotografía del hero móvil pasa de 157.398 bytes en el original a 76.440 bytes en la variante WebP de 640 px observada en Chrome: aproximadamente 51 % menos. Otras densidades seleccionan otro tamaño.
- Comprobaciones HTTP sin cookies: descubrimiento de sesión `200`/usuario nulo; cuenta y API de productos administrativos `401`; `/account` redirige al login. Todas las respuestas correspondientes siguen privadas/sin caché.
- Chrome sobre el build compilado: hero en 390/768/1440 px, fotografías de categorías optimizadas, menú y anclas, galería, variante de 50 × 90 cm, carrito de invitado persistido al recargar y búsqueda móvil con tres resultados. Sin errores de consola en los recorridos comprobados. La sesión existente también abre el panel administrativo. Se retiró únicamente el artículo de prueba del carrito aislado; el carrito previo de localhost no se modificó.

La nueva puntuación móvil queda pendiente de repetir PageSpeed después del despliegue. No se debe presentar el build local como una mejora ya publicada.

## Referencias técnicas

- [Chrome: descubrir y priorizar el recurso LCP](https://developer.chrome.com/docs/performance/insights/lcp-discovery).
- [Next Image: art direction con `getImageProps`](https://nextjs.org/docs/app/api-reference/components/image#art-direction).
- [Next: ventajas y límites de inlineCss](https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss).
- [Zod Mini](https://zod.dev/packages/mini).
