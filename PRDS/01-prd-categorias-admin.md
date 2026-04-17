# PRD 01 — Gestión administrativa de categorías

## Problema

El negocio necesita organizar el catálogo en una estructura jerárquica clara para navegación, merchandising y administración. Hoy no existe una sección de categorías en el panel admin, por lo que no se puede crear ni mantener una taxonomía consistente, ni preparar la navegación pública del storefront.

## Objetivo

Permitir que el equipo administrativo gestione categorías y subcategorías desde el panel admin con un flujo completo de CRUD, listado server-side, orden manual, activación, desactivación, papelera lógica y preparación de SEO para páginas públicas.

## Usuarios y contexto

- **Super admin / admin**: crean y mantienen la estructura comercial.
- **Support**: puede consultar o editar según permisos que el sistema defina más adelante.
- **Clientes storefront**: consumen indirectamente esta estructura al navegar categorías públicas.

## Valor de negocio

- Establece la arquitectura de navegación del catálogo.
- Evita productos mal clasificados o imposibles de descubrir.
- Prepara páginas públicas por categoría con slug y SEO.
- Reduce trabajo manual futuro al soportar orden y jerarquía desde el inicio.

## Alcance

### Incluye

- Sección administrativa de categorías.
- Listado principal con búsqueda, filtros, orden y paginación server-side.
- Creación de categorías raíz y subcategorías.
- Edición de categorías existentes.
- Activación e inactivación de categorías.
- Orden manual de categorías.
- Imagen opcional por categoría.
- Slug único por categoría.
- Campos SEO por categoría.
- Borrado lógico y restauración.
- Acciones masivas en el listado.

### No incluye

- Reglas avanzadas de merchandising automático.
- Importación/exportación masiva.
- Vista analítica de rendimiento por categoría.
- Personalización visual compleja de landing por categoría.

## Requisitos funcionales

1. El admin puede ver un listado principal de categorías con datos suficientes para operar rápidamente.
2. El listado debe soportar búsqueda server-side por nombre y slug.
3. El listado debe soportar filtros server-side por estado, jerarquía y papelera.
4. El listado debe soportar orden server-side y paginación server-side.
5. El admin puede crear una categoría raíz.
6. El admin puede crear una subcategoría asociada a una categoría padre.
7. El admin puede editar nombre, descripción, slug, imagen, orden, estado y metadatos SEO.
8. El admin puede activar o desactivar una categoría sin borrarla.
9. El admin puede mover una categoría a papelera mediante borrado lógico.
10. El admin puede restaurar una categoría desde papelera.
11. El sistema debe impedir inconsistencias jerárquicas evidentes, como asignar una categoría como hija de sí misma.
12. El admin puede ejecutar acciones masivas sobre múltiples categorías seleccionadas.
13. El sistema debe mostrar la cantidad de productos asociados a cada categoría cuando esa información esté disponible.
14. El sistema debe permitir definir orden manual para la visualización en storefront y admin.
15. Cada categoría debe poder tener página pública por slug cuando el storefront esté habilitado.

## Datos que la categoría debe soportar

- Nombre
- Slug
- Descripción
- Imagen opcional
- Categoría padre opcional
- Orden manual
- Estado activo/inactivo
- SEO title
- SEO description
- Borrado lógico
- Fechas de creación y actualización

## Reglas de negocio

- Una categoría puede ser raíz o hija, pero no ambas respecto al mismo ancestro en una relación circular.
- Una categoría inactiva no debe aparecer como opción pública navegable.
- Una categoría en papelera no debe aparecer en listados operativos por defecto.
- El slug debe ser único dentro del catálogo de categorías.
- El orden manual debe ser respetado en listados públicos donde aplique.
- Si una categoría padre queda inactiva o en papelera, el comportamiento de sus hijas debe ser consistente y visible para el admin.
- La existencia de productos asociados no debe impedir la inactivación, pero sí debe manejarse claramente en la UI cuando se envía una categoría a papelera.

## Casos borde

- Crear una subcategoría sin padre válido.
- Intentar reutilizar un slug ya existente.
- Enviar a papelera una categoría con subcategorías activas.
- Enviar a papelera una categoría con productos asociados.
- Restaurar una categoría cuyo padre original ya no existe o está en papelera.
- Mover una categoría a un padre que generaría bucles jerárquicos.

## Requisitos de experiencia de usuario

- La vista principal debe sentirse operativa y rápida de escanear.
- Los filtros deben ser visibles y fáciles de limpiar.
- La tabla debe mostrar estado y jerarquía de forma comprensible.
- Las acciones destructivas deben requerir confirmación.
- El estado de papelera debe estar claramente diferenciado del estado inactivo.

## Criterios de aceptación

- Dado un admin autenticado, cuando entra a la sección de categorías, entonces ve un listado con búsqueda, filtros, orden y paginación server-side.
- Dado un admin, cuando crea una categoría raíz válida, entonces la categoría aparece en el listado operativo.
- Dado un admin, cuando crea una subcategoría válida, entonces queda vinculada a su categoría padre y visible con la jerarquía correcta.
- Dado un slug duplicado, cuando el admin intenta guardar la categoría, entonces el sistema impide la operación e informa el conflicto.
- Dado un admin, cuando mueve una categoría a papelera, entonces deja de aparecer en el listado operativo por defecto y puede verse en la vista de papelera.
- Dado un admin, cuando restaura una categoría desde papelera, entonces vuelve al estado operativo sin perder sus datos principales.
- Dado varias categorías seleccionadas, cuando el admin ejecuta una acción masiva válida, entonces el sistema aplica la acción a todos los elementos elegibles y reporta cualquier excepción.

## Métricas de éxito

- Tiempo de creación de una categoría o subcategoría menor que el flujo manual actual.
- Reducción de errores de clasificación al momento de cargar productos.
- Uso frecuente del filtro y búsqueda sin degradación perceptible en listados grandes.

## Dependencias

- Panel admin con navegación y permisos básicos disponibles.
- Infraestructura de datos para persistir jerarquía, slugs, estados y borrado lógico.

## Riesgos

- Resolver mal la lógica de jerarquía y permitir estados inconsistentes.
- No separar claramente inactivo vs papelera y confundir operación.
- Diseñar una tabla difícil de usar cuando el número de categorías crezca.

## Open questions

- Cómo se comportará la restauración cuando el padre original no esté disponible.
- Qué permisos específicos tendrá el rol support sobre categorías.
