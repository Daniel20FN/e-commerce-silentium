# PRD 06 — Carrito y compra por WhatsApp

> **Cambio de alcance vigente:** el usuario indica carrito → WhatsApp con mensaje preparado, sin pasarela de pago de momento. Esto sustituye las referencias siguientes a checkout/pagos como continuación inmediata. El usuario confirmó que abrir WhatsApp no requiere iniciar sesión. Los demás requisitos de carrito siguen siendo una propuesta.

## Objetivo y estado

Permitir preparar una compra con variantes reales, cantidades y subtotal actualizado, sin exigir una cuenta para explorar o añadir productos.

**Aprobado por el usuario:** carrito de invitado conservado en el mismo navegador, sincronización entre dispositivos fuera de esta fase y compra mediante mensaje preparado en WhatsApp, sin pasarela. El usuario confirmó la apertura de WhatsApp sin iniciar sesión; la elección anterior de login en checkout no aplica a este canal. Las demás reglas de este PRD constituyen la propuesta de implementación.

## Alcance

### Incluye

- Añadir la variante resuelta desde el detalle del producto y elegir cantidad.
- Acceso global al carrito con contador de unidades y página `/carrito`.
- Líneas con producto, atributos de variante, imagen con fallback, precio unitario, cantidad y subtotal.
- Incrementar, reducir y retirar líneas; vaciar con confirmación.
- Persistencia local versionada, recuperación segura y sincronización entre pestañas del mismo navegador.
- Revalidación de precios y disponibilidad contra el catálogo público mediante contrato de servidor.
- Estados vacío, carga, error, artículo no disponible y cambios de precio o stock.

### No incluye

- Pedidos, reservas de inventario, pagos ni descuentos/cupones.
- Envíos o impuestos calculados. El resultado es un subtotal de productos, no el total definitivo de compra.
- Carrito de cuenta, sincronización entre dispositivos o fusión con un carrito remoto al iniciar sesión.
- Checkout online: no enlazar a una ruta inexistente ni presentar un botón que simule completar la compra. La acción de compra abre WhatsApp según el flujo de esta especificación.

## Reglas de líneas y cantidades

| Tema             | Regla propuesta                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Identidad        | Una línea por `variantId`; añadirla otra vez suma cantidad, no duplica la línea                                            |
| Variantes        | Solo añadir una combinación completa, existente, activa y de un producto publicable, no eliminado                          |
| Cantidad         | Entero positivo; el menor entre stock actual y 99 unidades por variante                                                    |
| Capacidad        | Hasta 50 variantes distintas por carrito; los límites se validan en cliente y servidor                                     |
| Exceso al añadir | No superar silenciosamente el stock o el límite: rechazar el incremento y explicar el máximo disponible                    |
| Stock reducido   | Conservar la cantidad solicitada y marcarla como inválida hasta corregirla o retirar la línea; no modificarla sin informar |
| No disponible    | Mantener una línea identificable, no comprable y retirable; no filtrar metadatos privados de productos despublicados       |
| Precio cambiado  | Mostrar el precio vigente y avisar del cambio respecto de la última consulta; el anterior nunca se usa para cobrar         |
| Precio cero      | Conservar la semántica actual del catálogo; cero no significa automáticamente falta de precio ni producto inactivo         |

El carrito no modifica stock ni garantiza disponibilidad futura. Antes de abrir WhatsApp se revalida el catálogo; el negocio confirma las condiciones finales en la conversación.

## Persistencia e identidad

- Guardar como fuente local únicamente versión, IDs de variante y cantidades. No persistir tokens, datos personales, costos, precios autoritativos ni objetos completos de producto.
- Una caché visual mínima en memoria puede ayudar a reconocer una línea recién añadida. Tras recargar, si el servidor no devuelve información pública de una variante, mostrar una referencia genérica retirable, sin inventar nombre, imagen o precio.
- Recargar o cerrar y abrir el navegador conserva el carrito cuando el almacenamiento está disponible. Borrarlo o usar otro dispositivo no lo recupera.
- Inicio y cierre de sesión conservan el carrito local; no se asocia implícitamente a la cuenta. En un dispositivo compartido, el usuario puede vaciarlo.
- Si el almacenamiento está bloqueado o lleno, mantener la sesión en memoria y avisar que no se conservará al salir.
- Validar datos locales como entrada no confiable: estructura, versión, duplicados, IDs y cantidades. Descartar entradas inválidas sin romper la página; avisar si se recupera parcialmente o se reinicia un formato desconocido.
- Cambios entre pestañas actualizan la vista sin bucles. Resolver conflictos con la última escritura completa válida; no prometer fusión transaccional ni sincronización remota.

## Precios, subtotal y revalidación

1. El cliente envía IDs y cantidades a una lectura de carrito acotada; no envía importes aceptados como verdad por el servidor.
2. El servidor consulta el catálogo vigente y devuelve líneas resueltas, estados y subtotales en COP. Debe reutilizar las reglas públicas de elegibilidad e imágenes, sin consultar costos privados.
3. Revalidar al abrir el carrito, cambiar cantidades, volver a la pestaña y antes de preparar el mensaje de WhatsApp. Las operaciones de añadir también validan contra servidor.
4. Evitar que respuestas antiguas sobrescriban operaciones recientes. Bloquear o serializar mutaciones por línea cuando corresponda.
5. Marcar como no actualizado el resumen mientras se verifica. Ante fallo de red, conservar líneas y permitir retirar, reintentar o seguir explorando; no presentar importes antiguos como confirmados.
6. Una línea inválida no recibe un precio inventado. Mostrar por separado el subtotal de las líneas válidas y una advertencia; nunca un aparente total completo y comprable.
7. Multiplicar y sumar enteros de forma segura. Compare-at price es informativo y no interviene en el importe a pagar.

La lectura de carrito responde con `private, no-store`, limita tamaño del cuerpo y número de líneas y no expone modelos Prisma completos. Se validan también los cuerpos manipulados fuera del navegador.

## Experiencia de usuario

- Mobile-first: tarjetas por línea, controles cómodos, importes legibles y resumen sin desbordamiento horizontal.
- El detalle mantiene la galería y resolución de variantes ya existentes. No añadir desde tarjetas de catálogo cuando no se ha elegido una variante inequívoca.
- Confirmación accesible al añadir y contador global que suma unidades; no anunciar éxito antes de validar la operación.
- Sin selección válida o sin stock, la acción explica por qué no puede añadirse.
- Estado vacío con acceso al catálogo. Retirar una línea no exige confirmación repetitiva; vaciar todo sí.
- Etiquetas, mensajes y errores en diccionario. Foco visible, controles etiquetados y avisos accesibles sin depender solo del color.
- No pedir sesión en `/carrito`. No implementar checkout online ni modificar sus prefijos protegidos en esta fase. Abrir WhatsApp no requiere sesión (aprobado).

## Comprar por WhatsApp

1. Pulsar **Comprar por WhatsApp** con un carrito no vacío revalida todas las líneas. Bloquear si hay líneas no disponibles o cantidades inválidas; si cambia el precio, informar y pedir revisar antes de continuar.
2. Preparar texto con nombre, variante/atributos, SKU, cantidad, precio unitario, subtotal por línea y subtotal de productos en COP. Aclarar que disponibilidad final, envío y pago se acuerdan por WhatsApp.
3. Incluir enlace público de producto y, opcionalmente, enlace de imagen principal de variante con fallback a producto. No adjuntar fotos automáticamente ni garantizar vistas previas.
4. Abrir `wa.me` del número confirmado **+57 316 6218114** (destino normalizado `573166218114`) con texto codificado. El cliente revisa y pulsa enviar dentro de WhatsApp: no hay envío automático ni confirmación verificable de envío.
5. Conservar el carrito al abrir o volver del chat. No registrar pedido confirmado, modificar stock ni mostrar éxito de compra.

Probar un presupuesto conservador para longitud del enlace codificado. Si se supera, ofrecer resumen completo copiable y apertura del chat con texto breve; nunca truncar productos/cantidades silenciosamente. Incluir alternativa de copiar mensaje ante problemas de apertura. Los enlaces de ficha requieren origen público configurado; nunca localhost. El usuario aún no tiene dominio: omitir esos enlaces, avisar e incluir SKU y fotos públicas mientras tanto.

Ejemplo orientativo:

```text
Hola, quisiera comprar estos productos:

1. Aurora — Doble / Marfil
SKU: DEMO-AURORA-3
Cantidad: 2
Precio unitario: $219.000 COP
Subtotal: $438.000 COP
Producto: [enlace público]
Foto: [enlace público de imagen, opcional]

Subtotal de productos: $438.000 COP
¿Me confirman disponibilidad, envío y forma de pago?
```

Validar destino, codificación, imágenes/enlaces públicos, mensajes extensos y retorno conservando carrito en Chrome móvil y escritorio. No enviar mensajes reales durante QA sin autorización.

Referencia: [WhatsApp — Click to chat](https://faq.whatsapp.com/5913398998672934).

## Encaje técnico previsto

| Área          | Integración                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Dominio nuevo | `src/domains/cart/`: reglas, contratos, estado/persistencia, servicios y componentes                  |
| Detalle       | `src/domains/storefront/components/product_detail.tsx`: cantidad y añadir variante resuelta           |
| Navegación    | `src/components/navbar.tsx`: acceso y contador compartido                                             |
| Catálogo      | Reutilizar elegibilidad, consultas públicas e imágenes de `src/domains/storefront/`                   |
| Página/API    | `/carrito` y lectura pública acotada de resolución de carrito; contrato exacto durante diseño técnico |
| Sesión        | Respetar `/checkout` protegido en `src/domains/auth/services/auth_routes.ts`                          |

Sin migración de base de datos para el carrito local. Todas las llamadas desde componentes usan `apiService` o `useCancellableApi`, con parámetros y respuestas únicos del dominio. La hidratación no debe escribir un carrito vacío antes de leer el almacenado ni mostrar un contador falso como definitivo.

## Criterios de aceptación y pruebas

| Escenario                                                | Resultado esperado                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Invitado añade una variante válida                       | Línea correcta con imagen/atributos, cantidad y contador; sin login               |
| Repite variante o añade otra del mismo producto          | La primera acumula cantidad; variantes diferentes mantienen líneas separadas      |
| Cantidad negativa, decimal, excesiva o cuerpo manipulado | Rechazo validado y sin persistir estado inválido                                  |
| Stock baja o producto se archiva/elimina                 | Línea conservada y marcada; no puede pasar por una compra válida                  |
| Cambia el precio                                         | Precio/subtotal vigente y aviso; nunca confiar en el valor local                  |
| Recarga, login/logout o nueva pestaña                    | Persistencia local coherente sin fusión de cuenta ni pérdida por hidratación      |
| Storage corrupto, desconocido o no disponible            | Recuperación/aviso, UI usable y sin datos sensibles                               |
| Respuestas de red fuera de orden o error                 | No revivir líneas retiradas ni perder cantidades recientes; permitir reintento    |
| Retira/vacía                                             | Contador, persistencia y resumen se actualizan; vaciar requiere confirmación      |
| Chrome móvil y escritorio                                | Navegación completa por teclado, imágenes, importes, controles y estados visibles |

Verificar con pruebas unitarias de cantidades/persistencia/totales, pruebas de servicio/API con catálogo cambiante y privacidad, pruebas de UI e hidratación y recorrido real en Chrome. Ejecutar Jest, TypeScript, lint y build; documentar el resultado real, no solo el plan.

## Decisiones posteriores

- Número receptor confirmado: **+57 316 6218114**. Apertura sin login confirmada. El formato de enlaces/imágenes sigue la propuesta de mensaje de este PRD.
- Checkout online, pasarela, pedidos persistidos e inventario transaccional quedan aplazados, fuera del alcance inmediato.
- Una futura sincronización por cuenta requiere reglas explícitas de fusión; no queda implícita en este carrito.
