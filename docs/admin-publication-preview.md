# Revisar y activar un producto

La sección **Publicación** de la ficha administrativa diagnostica los datos guardados y permite revisar la presentación del catálogo antes de activar un producto. No añade requisitos comerciales nuevos.

## Ruta rápida

1. Guarda los cambios de Información, Variantes e Imágenes.
2. Abre **Publicación** y revisa estado, visibilidad y posibilidad de compra.
3. Usa los accesos de corrección para resolver las causas relevantes.
4. Abre **Vista previa privada** y revisa móvil/escritorio. La compra está deshabilitada.
5. Confirma la activación y revisa el diagnóstico actualizado. **Ver en la tienda** aparece solo si el producto cumple la consulta pública.

## Qué significa cada resultado

| Resultado       | Criterio                                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visible         | Producto activo, no archivado ni en papelera, con alguna categoría navegable y alguna variante activa no retirada. Se reutiliza `publicProductWhere`, incluida la visibilidad de ancestros de categorías. |
| Comprable       | Además de ser visible, existe una variante activa no retirada con stock positivo.                                                                                                                         |
| Bloqueo vigente | Explica una condición que impide la visibilidad actual; no introduce un validador nuevo para guardar o activar.                                                                                           |
| Advertencia     | Por ejemplo, stock cero, variante predeterminada no disponible o categorías ocultas.                                                                                                                      |
| Recomendación   | Fotos, SEO o costos incompletos. No bloquea borradores ni añade requisitos de publicación.                                                                                                                |

Una categoría oculta no elimina necesariamente la ficha si otra categoría asociada es navegable. Un producto activo agotado puede seguir visible, pero no se presenta como comprable.

## Seguridad y concurrencia

- Las rutas de preview y su contenido exigen sesión administrativa antes de consultar el producto. No hay tokens ni enlaces públicos para compartir borradores.
- Las respuestas administrativas son privadas, sin almacenamiento en caché compartida y sin indexación. El contenido del preview es dinámico.
- El preview proyecta explícitamente los campos de la ficha pública: no incluye costos, márgenes ni metadata interna de Storage. No monta controles de carrito ni genera mensajes de WhatsApp.
- Los archivos de imágenes ya publicados en el bucket público siguen siendo públicos; el preview no revoca ni vuelve confidenciales esas URL.
- Activar utiliza el PATCH existente con `expectedUpdatedAt`. Una revisión desactualizada requiere recargar; no se sobrescriben cambios concurrentes. El servidor vuelve a comprobar el estado y las categorías.
- Los anchos móvil/escritorio ayudan a revisar composición; no sustituyen las pruebas en dispositivos reales.
- La muestra reutiliza directamente `ProductDetail`, sin iframe ni una segunda carga autenticada. En preview, las container queries adaptan columnas, separación y título al ancho de la muestra; la ficha pública conserva sus breakpoints de ventana.

## Verificación

Jest cubre política, proyección, autorización, cabeceras, diagnóstico y confirmación/conflictos de activación. La prueba opcional sobre PostgreSQL usa datos QA aislados, sin subir archivos ni consumir stock real:

```powershell
$env:PUBLICATION_INTEGRATION = "1"
npm run test:file -- src/domains/admin/products/services/publication_service.integration.test.ts
Remove-Item Env:PUBLICATION_INTEGRATION
```

Requiere `DATABASE_URL` explícita en `.env.development`. Retira sus fixtures al terminar. En Windows, termina Jest y Next antes de regenerar Prisma o compilar.

Verificación local del PRD08: 522 pruebas Jest aprobadas, 14 integraciones opcionales omitidas en la ejecución normal; la integración de publicación se ejecutó y aprobó por separado. TypeScript, compilación de producción y lint sin errores (queda una advertencia del archivo de cobertura generado). En Chrome se verificaron activación, enlace público, agotado, consulta de un fixture archivado/retirado y anchos de 320/390/1200 px. En la vista privada de Aurora se probaron la galería general, ambas opciones, cambio de precio/SKU/stock y las dos fotos propias de Doble Arena, sin modificar el producto ni habilitar compras. Los accesos anónimos a preview/contenido redirigen al login y la API responde 401; todos conservan `private, no-store` y `noindex, nofollow, noarchive`.

## Fuera de alcance

Programación de publicación, SEO avanzado, preview público compartible y nuevas reglas comerciales. El siguiente bloque del roadmap es [PRD 09 — Operaciones rápidas](../PRDS/09-prd-operaciones-rapidas-catalogo.md).
