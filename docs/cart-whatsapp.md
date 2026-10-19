# Carrito de invitado y solicitudes por WhatsApp

El cliente prepara variantes y cantidades sin iniciar sesión. **Comprar por WhatsApp** revalida el catálogo, muestra el mensaje para revisión y ofrece abrir el chat de **+57 316 6218114**. El cliente pulsa enviar dentro de WhatsApp; venta, envío y pago se acuerdan manualmente.

## Configuración

| Valor                                 | Comportamiento                                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Número comercial                      | `SALES_WHATSAPP_PHONE` en `src/domains/cart/services/whatsapp.ts`, normalizado como `573166218114`                                        |
| `APP_PUBLIC_URL` (opcional, servidor) | Origen HTTPS público, por ejemplo `https://tienda.example.com`. Sin credenciales ni puertos. Reiniciar/republicar después de configurarlo |
| Sin dominio público                   | El mensaje funciona con SKU y fotos públicas. Omite enlaces de ficha y avisa al cliente; nunca comparte localhost                         |

No se necesita token de WhatsApp, pasarela, nueva dependencia ni migración. No inventar un dominio. El destino fijo no se obtiene de parámetros enviados por el cliente.

## Persistencia

- `silentium.cart.v1` en localStorage: versión, IDs de variante y cantidades. Nunca precios autoritativos, datos personales, sesiones ni costos.
- Una línea por variante; máximo 50 variantes y 99 unidades por variante, sujeto al stock vigente.
- Recarga, navegación y cierre de sesión conservan el carrito local. No se sincroniza por cuenta ni entre dispositivos. Vaciar exige confirmación.
- Entre pestañas gana la última escritura válida completa; no hay fusión transaccional. Datos corruptos se recuperan de forma acotada; almacenamiento bloqueado deja el carrito en memoria y muestra advertencia.

## Validación y privacidad

`POST /api/cart/resolve` es una lectura pública acotada a 16 KiB, con validación estricta y `private, no-store`. Reutiliza las reglas públicas de publicación/categorías del storefront y selecciona únicamente datos necesarios; no modifica stock ni expone costos.

Se revalida al añadir, abrir, cambiar cantidades, volver a la pestaña y preparar el mensaje. Importes enteros en centavos, presentados en COP. Cambios de precio visibles; cantidades superiores al stock deben corregirse. Las líneas no elegibles siguen siendo retirables sin revelar datos privados. El subtotal parcial se identifica y bloquea la continuación.

La revisión preparada se invalida si cambia el carrito o se detectan nuevos precios/disponibilidad. Abrir WhatsApp **no confirma envío, pago ni pedido**, no reserva stock y no vacía el carrito.

## Texto e imágenes

Nombre, atributos, SKU, cantidades, precios unitarios, importes por línea y subtotal de productos. Se adjuntan al texto enlaces HTTPS públicos de fotos (primera imagen de variante, fallback a general); no archivos automáticos ni vistas previas garantizadas.

`wa.me` lleva texto codificado al destino fijo. Por encima de 7.000 caracteres de URL, conservar el mensaje completo copiable y abrir solo un saludo breve. El cliente copia/pega el resumen. Si falla el portapapeles, se puede seleccionar el texto manualmente. Nunca truncar artículos silenciosamente.

## Pruebas

- `npm run test`, `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build`.
- PostgreSQL opt-in: `$env:CART_INTEGRATION='1'` y `npm run test:file -- src/domains/cart/services/cart_service.integration.test.ts`; quitar la variable después. Requiere `DATABASE_URL` explícita en `.env.development`, crea fixtures QA aislados y los retira lógicamente. Sin uploads, mensajes ni consumo de stock.
- Chrome móvil/escritorio: invitado, repetidos, variantes distintas, fotos, cantidades, recarga, logout, vaciado confirmado, resumen/copia y apertura real del destino. No enviar mensajes reales sin autorización.
- Windows: finalizar Jest/Next propios antes de generar Prisma o compilar, para liberar la DLL.

Fuera de alcance: pago online, pedidos persistidos, seguimiento comercial, envíos calculados, reservas y sincronización por cuenta. La aplicación no sabe si se envió el mensaje o se cerró la venta.

### Resultado verificado — 2026-10-19

- Jest completo: **433 pruebas correctas**, 13 integraciones opt-in omitidas en la ejecución normal. Las **2 pruebas PostgreSQL de carrito** se ejecutaron aparte y pasaron, con fixtures retirados.
- TypeScript, lint (solo avisos preexistentes) y build de producción correctos. Build repetido tras ajustar el texto de validación de cantidades.
- HTTP anónimo real: resolución **200**, `private, no-store`, subtotal correcto y sin campos de costos; un precio sobreescrito en el cuerpo recibe **400**.
- Chrome: añadir repetidos, variantes distintas, cantidades, imágenes, recarga, logout sin perder carrito, sincronización entre pestañas, retirada, cancelación y confirmación del vaciado. Cantidad cero bloquea la compra.
- Resumen y copia correctos; apertura real de WhatsApp muestra **Silentium para mi Hogar**, destino correcto y texto completo con fotos públicas. **No se envió ningún mensaje.**
- Carrito de ejemplo retenido en Chrome: 2 unidades Sencillo Marfil + 1 Sencillo Arena = **$577.000 COP**, con dos fotos públicas distintas. El build final muestra el rango correcto al introducir cero y bloquea la compra hasta corregirlo.
- Chrome móvil: contenido de 375–390 px sin desbordamiento horizontal; diálogo de unos 326 px con acciones accesibles. Tamaño de pantalla temporal restaurado.
- Chrome tenía extensiones que inyectaban atributos HTML (`speedupyoutubeads`, `cz-shortcut-listen`) y generaban avisos de hidratación ajenos al carrito. No se suprimieron las comprobaciones de React para ocultarlos.
