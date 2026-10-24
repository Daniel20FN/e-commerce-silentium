# Mi cuenta

## Acceso

Desde el menú de usuario de la tienda, abre **Mi cuenta** (`/account`). En administración, el avatar superior lleva al mismo lugar. Se requiere sesión y correo confirmado. Las respuestas y la página son privadas, sin caché compartida y fuera de los buscadores.

## Qué puede hacer cada persona

- Consultar su nombre, apellidos, correo y teléfono de contacto.
- Editar nombre, apellidos y teléfono. El teléfono no se considera verificado ni concede consentimiento comercial.
- Cambiar su contraseña escribiendo la actual, la nueva y su confirmación. Tras el cambio se solicitan la revocación global de sesiones de refresco y un nuevo ingreso.
- Eliminar su cuenta confirmando su correo y contraseña actual en un diálogo separado.

El correo se muestra de solo lectura: cambiarlo requiere un flujo de verificación específico, no una edición libre de texto. No se exponen controles de rol, estado, identificadores de otros usuarios ni consentimientos publicitarios en este formulario.

## Qué implica eliminar

Se elimina la identidad en Supabase Auth, el perfil local, las direcciones, las preferencias y las invitaciones dirigidas a esa cuenta. Se conserva una referencia técnica no utilizable para iniciar sesión: identificador de Auth, identificador interno, correo aleatorio en el dominio reservado `deleted.invalid`, estado inactivo y sin rol administrativo. Esta referencia evita que una petición en curso o sesión antigua vuelva a crear el usuario y conserva la procedencia de invitaciones emitidas. Se excluye del listado operativo de Usuarios y no puede reactivarse ni eliminarse desde sus acciones normales.

No se borran indiscriminadamente los pedidos ni los registros operativos inmutables. Sus instantáneas pueden contener nombres o datos de contacto: eliminar la cuenta **no equivale a suprimir todo dato histórico de la persona**. La pantalla lo explica y enlaza con contacto@silentium-hogar.com para revisar solicitudes de acceso, rectificación o supresión. La política y los plazos de conservación requieren validación del responsable de la tienda; esta función no certifica cumplimiento legal. Las copias de seguridad y los objetos de Storage tampoco se purgan automáticamente.

El último superadministrador activo y con correo verificado no puede eliminarse, bloquearse, inactivarse ni perder ese rol. Debe existir otro responsable activo y verificado primero. Un bloqueo transaccional compartido serializa cambios de privilegios y borrados, evitando decisiones concurrentes sobre un recuento desactualizado. La sincronización normal usa un bloqueo por identidad y filas bloqueadas: no serializa a todos los compradores. No convierte una cuenta administradora normal en superadministradora automáticamente.

## Seguridad y límites operativos

- La identidad procede exclusivamente de `getUser()` y del enlace privado local a Auth; los esquemas estrictos rechazan roles e identificadores añadidos al cuerpo.
- Las mutaciones exigen JSON y origen coincidente. Los enlaces no transportan contraseñas ni identificadores seleccionables.
- Las acciones sensibles verifican otra vez la contraseña con un cliente aislado y sin persistencia. Su sesión temporal se cierra incluso cuando falla una operación; no se envían tokens al navegador.
- Auth y PostgreSQL no comparten transacción. Los cambios locales se preparan en una transacción y el borrado de Auth se solicita al final con tiempo limitado. Un fallo del proveedor provoca rollback local. Si Auth borra pero falla el commit final de PostgreSQL, se muestra un error y puede requerirse reparación por el superadministrador: no se anuncia un éxito incierto.
- Revocar sesiones impide su refresco; no promete invalidar instantáneamente JWT ya emitidos en servicios externos. La aplicación vuelve a verificar Auth y rechaza referencias de cuentas eliminadas.
- Los nombres editados en la base de datos no se sobrescriben con los metadatos antiguos del registro al iniciar sesión.
- No se registra ni guarda ninguna contraseña. Los fallos del proveedor se traducen a códigos seguros.

## Verificación

Las pruebas unitarias cubren identidad propia, rechazo de privilegios en payload, origen, esquemas, confirmación, contraseña incorrecta, referencia de borrado, fallos del proveedor, limpieza de sesiones y protección del último superadmin también desde Usuarios. Las pruebas de navegador no deben cambiar contraseñas ni eliminar identidades reales: desarrollo y producción comparten actualmente base de datos. La validación destructiva real debe realizarla una persona con una cuenta expresamente descartable y autorización en ese momento.
