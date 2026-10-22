# Landing: recorrido textil

## Composición aprobada

Hero existente → productos → colecciones → «Elige. Conversemos.» →
«Siéntete en casa.» → ayuda → contacto. El hero y el cierre no cambian.

Colecciones muestra hasta tres categorías principales públicas, en el orden del
catálogo. «Ver todas las categorías» abre `/categorias`, que no limita el número
de categorías principales; sus fichas permiten acceder a las subcategorías.

La guía de compra muestra una habitación, una fotografía del catálogo, una
selección y un mensaje ilustrativos. No es un segundo carrito: no tiene controles,
no reserva stock y no envía mensajes. Utiliza el primer producto público disponible
con imagen y su precio actual (con «Desde» cuando corresponda), sin inventar
variantes. Si falta catálogo, muestra una invitación sin precios ficticios.

La historia de marca utiliza dos fotografías de ambiente, cortina transparente,
una sola frase y el logotipo oficial. Los créditos se consultan mediante un
desplegable nativo; la procedencia y la licencia están en
`public/images/landing/provenance.json`. Estas fotografías no representan SKU.

## Movimiento y carga

- Secciones semánticas renderizadas en servidor, fotos inferiores con carga diferida.
- El observador existente inicia una sola secuencia por escena; no hay bucles,
  captura del scroll, temporizadores ni bibliotecas adicionales.
- Los papeles flotantes conservan las sombras y giros de la propuesta aprobada:
  son objetos de la escena, no tarjetas interactivas de la aplicación.
- La composición final es el estado CSS inicial. Sin JavaScript, Web Animations
  o con movimiento reducido, el contenido sigue visible y completo.
- El foco, los enlaces directos y activar movimiento reducido durante la animación
  cancelan el movimiento relevante sin ocultar contenido.
- Los textos son entradas del diccionario, no texto incrustado en imágenes.

## Comprobación

Las pruebas de landing verifican orden, fotografía real frente a ambiente,
enlaces, contenido accesible y carga diferida. Las de movimiento verifican
ejecución única, giros finales, cancelación por foco y movimiento reducido.
Revisar visualmente Chrome en móvil, tableta y escritorio tras cualquier cambio.
