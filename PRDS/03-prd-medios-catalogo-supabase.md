# PRD 03 — Gestión de imágenes y medios del catálogo

## Problema

Un catálogo sin gestión visual sólida no es publicable ni operable. El negocio necesita cargar imágenes generales por producto y específicas por variante, ordenarlas, definir una principal y garantizar un fallback consistente cuando una variante no tenga medios propios.

## Objetivo

Permitir la administración completa de imágenes del catálogo, con soporte para almacenamiento externo, metadatos operativos y comportamiento claro entre imágenes generales del producto e imágenes específicas de variante.

## Usuarios y contexto

- **Super admin / admin**: cargan y mantienen medios del catálogo.
- **Support**: puede gestionar ajustes menores y verificar material visual.
- **Clientes storefront**: consumen imágenes consistentes en categorías, cards y detalle de producto.

## Valor de negocio

- Habilita publicación visual profesional del catálogo.
- Reduce errores visuales en storefront.
- Mejora la confianza del cliente y la comprensión de variantes.
- Evita duplicación innecesaria de medios cuando aplica fallback.

## Alcance

### Incluye

- Carga de múltiples imágenes generales por producto.
- Carga de múltiples imágenes específicas por variante.
- Definición de imagen principal.
- Reordenamiento manual de imágenes.
- Texto alternativo por imagen.
- Persistencia de URL pública y path de almacenamiento.
- Fallback automático a imágenes del producto cuando la variante no tenga imágenes propias.
- Imagen opcional por categoría si ya existe soporte funcional de categorías.

### No incluye

- Edición avanzada de imágenes dentro del sistema.
- Video, 3D o multimedia expandida.
- CDN multiorigen.
- Transformaciones inteligentes o automatizadas avanzadas.

## Requisitos funcionales

1. El admin puede cargar múltiples imágenes para un producto.
2. El admin puede marcar una imagen general como principal.
3. El admin puede definir el orden visual de las imágenes generales.
4. El admin puede cargar múltiples imágenes específicas para una variante.
5. El admin puede marcar una imagen de variante como principal.
6. El admin puede definir el orden visual de las imágenes de variante.
7. El admin puede editar el texto alternativo de cada imagen.
8. El sistema debe guardar tanto la URL pública como la referencia operativa de almacenamiento.
9. Si una variante no tiene imágenes propias, el storefront debe usar las imágenes generales del producto.
10. Si una variante sí tiene imágenes propias, esas imágenes deben priorizarse sobre las generales.
11. El admin puede eliminar una imagen individual sin afectar otras del mismo producto o variante.
12. El admin debe poder ver con claridad qué imágenes son generales y cuáles pertenecen a una variante específica.

## Reglas de negocio

- Un producto debe poder existir sin imágenes, pero no debería considerarse listo para storefront premium.
- La imagen principal general debe ser única dentro del producto.
- La imagen principal de variante debe ser única dentro de la variante.
- La ausencia de imágenes de variante no es un error si existen imágenes generales.
- El texto alternativo debe poder editarse para accesibilidad y SEO.
- La referencia operativa de almacenamiento debe conservarse para futuras tareas de mantenimiento, reemplazo o borrado.

## Casos borde

- Variantes sin imágenes y producto sin imágenes.
- Reemplazo de imagen principal por borrado o reordenamiento.
- Imagen huérfana por fallo parcial entre persistencia visual y metadata.
- Múltiples imágenes subidas con nombres similares o repetidos.

## Requisitos de experiencia de usuario

- El flujo de carga debe hacer evidente dónde se está cargando: producto o variante.
- Debe ser muy simple identificar imagen principal y orden.
- El fallback no debe ser un comportamiento oculto para el admin.
- El sistema debe minimizar confusión entre “imagen subida” e “imagen visible en storefront”.

## Criterios de aceptación

- Dado un producto, cuando el admin sube varias imágenes generales, entonces puede ordenarlas y elegir una principal.
- Dada una variante, cuando el admin sube imágenes propias, entonces el sistema las asocia a esa variante y las prioriza visualmente.
- Dada una variante sin imágenes propias, cuando un cliente la visualiza en storefront, entonces ve las imágenes generales del producto.
- Dado un admin, cuando elimina una imagen específica de variante y esa variante no tiene más imágenes propias, entonces el comportamiento vuelve a fallback general.
- Dado un admin, cuando consulta una imagen ya cargada, entonces puede ver y editar su texto alternativo.

## Métricas de éxito

- Reducción de productos publicados sin imagen funcional.
- Menor tiempo para cargar material visual por producto.
- Disminución de incidencias donde una variante se muestra sin respaldo visual.

## Dependencias

- PRD 02 completado para contar con productos y variantes.
- Disponibilidad de servicio de almacenamiento externo.

## Riesgos

- Inconsistencias entre archivo físico y metadata persistida.
- Fallback mal implementado y experiencia visual errática.
- Exceso de carga manual sin affordances claras en la interfaz.

## Open questions

- Límites de peso, cantidad o formato por imagen.
- Política futura de reemplazo vs versionado de medios.
