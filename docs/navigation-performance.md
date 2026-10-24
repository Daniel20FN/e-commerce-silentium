# Navegación con respuesta visible y menos trabajo por petición

La tienda conserva los datos frescos de catálogo y stock. Estas mejoras reducen consultas y contenido enviado, sin almacenar páginas privadas en caché ni cambiar datos comerciales.

## Qué cambia

- `loading.tsx` en raíz y catálogo permite cargar progresivamente las rutas dinámicas. El catálogo mantiene su marco de navegación mientras muestra un estado accesible, sin productos inventados.
- `NavigationLink` conserva el comportamiento de Next Link y sus referencias/eventos. `useLinkStatus` muestra una barra superior solo durante una transición pendiente, también mediante teclado. No simula porcentajes ni usa temporizadores para decidir si una ruta terminó.
- Las tarjetas, navegación, categorías y enlaces del pie usan navegación interna. Los enlaces de WhatsApp/teléfono y los formularios nativos conservan su comportamiento.
- Contador, página del carrito y botón de añadir esperan su propia hidratación antes de mostrar el estado persistido. `useHydrated` utiliza una instantánea inicial estable; el bootstrap puede terminar antes de que llegue una isla transmitida sin provocar que React descarte y regenere su HTML.
- Las propiedades de componentes públicos reciben únicamente las secciones del diccionario que utilizan, no los capítulos de la guía o los formularios del administrador.
- Esto incluye la pantalla de no encontrado: Next también serializa sus componentes de respaldo en rutas exitosas, por lo que reducir solo las propiedades de la página no eliminaba el diccionario completo.
- La ficha reutiliza las imágenes generales y de variantes ya seleccionadas, filtradas por `ready` y `deletedAt: null`. Mantiene la prioridad de fotos propias y el respaldo general; no vuelve a abrir una transacción para leer la misma galería.
- La primera página consulta recuento y filas en paralelo. Las páginas posteriores conservan el ajuste al máximo existente; filtros y ordenación siguen ejecutándose antes de paginar.
- El inicio consulta solo cuatro destacados y no calcula una paginación que no utiliza.
- `vercel.json` fija una región de funciones, `dub1`, junto a la base de datos de Irlanda (`eu-west-1`), confirmada en el panel de Supabase. No mueve la base de datos ni limita la distribución de estáticos del CDN.

## Comprobaciones de seguridad y accesibilidad

- Sin caché compartida nueva para stock, autenticación, cuenta o administración.
- Misma elegibilidad pública, selección de campos y ausencia de costes privados.
- Casos de galería propia, general y vacía cubiertos por pruebas.
- Estados con anuncio de carga, sin robar foco ni bloquear controles del marco.
- Movimiento reducido desactiva la animación de las barras; los marcadores de contenido son estáticos.
- La región entra en vigor al desplegar; no modifica automáticamente producción al editar este archivo.

## Referencia antes del cambio

Muestras HTTP públicas desde el equipo de desarrollo, 24 de octubre de 2026; no son percentiles, Core Web Vitals ni medidas representativas desde Colombia.

| Ruta              | Primer byte observado |
| ----------------- | --------------------- |
| Inicio            | 2,435 s               |
| Productos         | 2,196–3,345 s         |
| Almohada Descanso | 2,859–2,910 s         |
| Categorías        | 0,608–0,694 s         |
| Carrito           | 0,323 s               |

Las cabeceras de producción mostraban ejecución en `iad1` y respuestas privadas sin caché. En Chrome se reprodujo que la página anterior permanecía visible sin indicador mientras se resolvía la siguiente.

## Verificación del build local

- Suite final: 144 suites y 842 pruebas pasadas; 12 suites de integración y 63 pruebas omitidas por defecto. La comparación PostgreSQL de galerías se ejecutó por separado: una prueba de solo lectura pasada.
- Build de producción, tipos, lint de archivos modificados y formato correctos; detector estático de los nuevos estados sin hallazgos.
- Chrome: 390 px y escritorio; catálogo, galerías, cambio de medida/precio/stock, filtros móviles (búsqueda «Almohada»: tres resultados), cierre del menú y regreso a `#nosotros`.
- Se verificó la barra con un proxy local temporal que retrasaba cinco segundos las lecturas RSC; el indicador desaparece al terminar. La simulación no se incorpora a la aplicación y se detuvo tras la prueba.
- La comprobación con carrito previamente guardado detectó y corrigió diferencias de hidratación en el contador y en la página. Tres regresiones reproducen la restauración del estado entre SSR e hidratación para contador, página y botón de añadir.
- Respuestas HTML sin compresión de la ficha observada: 241.592 bytes en la versión anterior frente a 157.322 bytes en el build local final (aproximadamente 35 % menos). Listado: 367.203 frente a 279.583 bytes. Los textos de guía administrativa y vista previa ya no aparecen en esas respuestas públicas exitosas.
- Los tiempos locales no son comparables con la latencia de producción: la región nueva y su mejora real deben verificarse después del despliegue. No se ha publicado ni cambiado producción durante estas pruebas.

## Cómo verificar y publicar

1. Ejecutar la suite Jest, revisión de tipos, lint y build de producción, sin Prisma/Jest concurrentes en Windows.
2. Probar el build en Chrome móvil y escritorio: entrar a productos/categorías, abrir una ficha, cambiar variantes, usar filtros, volver y navegar por anclas.
3. Comparar galería pública y resolución anterior sobre registros existentes mediante una comprobación de solo lectura; no crear fixtures ni alterar stock real.
4. Tras publicar, comprobar que `X-Vercel-Id` refleja la región de función `dub1` y repetir las mismas rutas. Separar tiempo al primer byte, finalización y respuesta visual.
5. Verificar también navegación autenticada, error/no encontrado y carrito. No cambiar contraseñas ni eliminar cuentas reales.

Un primer byte más rápido por streaming no demuestra que el producto completo terminó antes: medir ambas cosas y no presentar resultados locales como mejoras ya desplegadas.

## Fuentes

- [Next.js: navegación y rutas dinámicas](https://nextjs.org/docs/app/getting-started/linking-and-navigating).
- [Next.js: useLinkStatus](https://nextjs.org/docs/app/api-reference/functions/use-link-status).
- [Vercel: configuración de regiones](https://vercel.com/docs/functions/configuring-functions/region).
