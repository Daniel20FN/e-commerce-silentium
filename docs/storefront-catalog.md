# Storefront de catalogo (PRD 04)

La tienda consume el catalogo real del admin. Categorias, productos, variantes, precios COP e imagenes se resuelven en el servidor; la seleccion de atributos y galeria cambia inmediatamente en el cliente. No incluye carrito, checkout ni reviews.

## Recorrido

1. Abrir `/categorias` o `/productos`. La home tambien usa categorias reales y productos marcados como destacados.
2. Entrar en `/categorias/[slug]`: incluye productos asociados a esa categoria y sus descendientes visibles, sin duplicarlos.
3. Entrar en `/productos/[slug]`: seleccionar atributos para consultar la variante exacta, precio, descuento real, referencia, stock e imagenes.
4. Usar **Restablecer seleccion** para vaciar los atributos y explorar otra combinacion. Las combinaciones inexistentes quedan deshabilitadas; las reales agotadas se pueden consultar y muestran su estado.

## Reglas de publicacion

| Caso                                                | Comportamiento                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Categoria inactiva, eliminada o con ancestro oculto | No aparece en navegacion ni se sirve su pagina publica                                                              |
| Categoria activa vacia                              | Pagina publica con estado vacio                                                                                     |
| Producto                                            | Activo, no eliminado, no archivado, con al menos una categoria visible y una variante activa no eliminada           |
| Sin variantes activas                               | No se publica el producto                                                                                           |
| Stock cero                                          | Producto/variante visibles como agotados, no se simula una compra                                                   |
| Variante inicial                                    | Predeterminada activa con stock; primera activa con stock; predeterminada agotada; primera activa                   |
| Atributos                                           | Solo valores utilizados por variantes activas; coincidencia completa y exacta                                       |
| Imagenes                                            | Las propias de variante reemplazan la galeria general; sin propias se hereda; sin ninguna hay placeholder explicito |
| Breadcrumb                                          | Categoria principal visible y ancestros; si la principal esta oculta, primera categoria visible                     |

La galeria inicial consume el resolver publico del PRD 03. Los DTO publicos solo incluyen datos de presentacion: no se envian bucket, path operativo, fechas de papelera ni estados internos de subida al navegador.

## Precios y orden

- Moneda unica: COP. `priceCents` y `compareAtPriceCents` son unidades menores; se dividen por 100 una sola vez al presentar con `priceFormatter` (`es-CO`). El valor cero es valido y los decimales reales no se descartan.
- Cards: precio minimo entre variantes con stock cuando las hay. Si todas estan agotadas, precio minimo entre variantes activas. **Desde** solo aparece cuando esos precios varian.
- El precio anterior debe ser mayor que el actual. No se construye un descuento combinando precios de variantes diferentes.
- Categorias: `sortOrder`, nombre, ID. Productos: destacados primero, nombre, ID. Paginacion de 24 productos en base de datos.
- Parametros de pagina invalidos vuelven a 1; paginas fuera del rango se ajustan al ultimo resultado. Las URLs paginadas siguen siendo navegables sin JavaScript.
- `/colecciones` redirige a `/categorias`; `/ofertas` a `/productos?ofertas=1`, usando descuentos vigentes de variantes activas.

## Arquitectura y vigencia

- `src/domains/storefront/services/catalog_service.ts`: consultas server-only y DTOs explicitos. Los listados consultan una pagina y las relaciones necesarias, no cargan todo el catalogo.
- `catalog_rules.ts`: reglas puras de jerarquia, combinaciones, variante inicial y paginacion.
- `src/app/(catalog)`: paginas publicas, metadata y estados de error/no encontrado. Render dinamico, sin cache global que mantenga contenido desactivado visible; `React.cache` solo deduplica dentro de la peticion.
- Los componentes cliente reciben DTOs serializables; no ejecutan Prisma ni llaman APIs remotas al cambiar opciones.
- No hay migraciones nuevas ni nuevas politicas anonimas de Supabase. La lectura publica pasa por el servidor y sus filtros de publicacion.

## Verificacion

- `npm run test`: reglas, consultas publicas, paginas, formato COP y seleccion de atributos con React Testing Library.
- `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build`.
- Integracion opt-in: `STOREFRONT_INTEGRATION=1` y `npm run test:file -- src/domains/storefront/services/catalog_service.integration.test.ts`. Exige `DATABASE_URL` explicitamente en `.env.development`; usa metadata QA aislada y borrado logico al terminar, sin subir objetos.
- Navegador: acceso anonimo, home, categoria padre/hija/vacia, paginacion, slugs no elegibles, variante con y sin imagen propia, agotados, combinaciones inexistentes, precios COP, mobile y teclado.

### Resultado de la verificacion (2026-10-19)

- Jest: **330 pruebas correctas**, 6 omitidas por ser integraciones opt-in; 66 suites correctas.
- Integracion PostgreSQL del storefront: **3/3 correctas**, ejecutadas por separado con `STOREFRONT_INTEGRATION=1`.
- TypeScript, lint y build de produccion: correctos. Lint conserva avisos preexistentes de `.eslintignore` y del informe generado de cobertura, sin errores.
- HTTP anonimo sobre la compilacion final: **12/12 casos correctos**, incluyendo 404 reales para borradores, archivados, eliminados, productos sin variantes y categorias ocultas. Sin filtracion de la variante privada de QA.
- Navegador real: ficha inicial, precio/stock/SKU por variante, imagen propia y fallback, miniaturas, combinacion inexistente deshabilitada, restablecimiento parcial, variante agotada, producto sin imagen/atributos, categorias padre/hija/vacia y paginacion 24+1.
- Responsive: movil 390px sin desbordamiento horizontal y escritorio; menu movil y selector mediante teclado comprobados. Precios accesibles incluyen el importe COP.
- Limpieza: 30 productos, 6 categorias y 3 registros de imagen QA retirados mediante borrado logico; cero productos/categorias QA activos, sin eliminar objetos de Storage. La ficha QA deja de publicarse inmediatamente.

No se incluye carrito, checkout, reviews ni las paginas corporativas/legales que ya eran placeholders. Los datos usados para las capturas eran fixtures, no productos comerciales.

### Cobertura de aceptacion

| Criterio PRD 04                                                | Evidencia                                                             |
| -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Categoria publica con productos elegibles                      | Tests de jerarquia/publicacion, integracion DB y navegador padre/hija |
| Producto con informacion y atributos                           | Tests de servicio/pagina/componente y navegador                       |
| Combinacion exacta actualiza precio, descuento, stock e imagen | Tests de reglas/componente y variantes reales de QA                   |
| Fallback de imagen general sin imagen propia                   | Resolver PRD 03 consumido, integracion DB y navegador                 |
| Inactivas excluidas y agotadas identificadas                   | Filtros de servicio, HTTP anonimo y navegador                         |
