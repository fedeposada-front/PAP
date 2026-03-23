# Casos de Uso y Happy Paths por Perfil

## 1. Alcance

Este documento describe los casos de uso funcionales y los happy paths de los perfiles de usuario actualmente contemplados en MonCadeauLocal.

Se basa en el comportamiento real implementado en la aplicación a fecha actual.

## 2. Perfiles de usuario

Los perfiles funcionales identificados son:

- Usuario no autenticado
- Comprador autenticado
- Vendedor en verificación
- Vendedor verificado

Nota:

- Un mismo usuario puede tener rol de comprador y vendedor.
- El acceso vendedor completo depende de que el SIRET haya sido validado.

## 3. Perfil: Usuario no autenticado

### 3.1 Objetivo del perfil

Explorar públicamente el marketplace y decidir si desea autenticarse para continuar con acciones privadas.

### 3.2 Casos de uso principales

#### UC-UNA-01 - Acceder a la aplicación

Actor:

- Usuario no autenticado

Objetivo:

- Entrar en la aplicación y llegar a la experiencia pública inicial.

Precondiciones:

- Ninguna

Flujo principal:

1. El visitante accede a la URL principal.
2. Se muestra la pantalla splash.
3. La aplicación detecta que no hay sesión activa.
4. La aplicación redirige a `/home`.

Resultado esperado:

- El usuario entra en la experiencia pública del marketplace.

#### UC-UNA-02 - Explorar la home pública

Actor:

- Usuario no autenticado

Objetivo:

- Descubrir tiendas y productos sin iniciar sesión.

Precondiciones:

- La home pública debe estar accesible.

Flujo principal:

1. El usuario entra en `/home`.
2. La app resuelve la ubicación o usa una localización por defecto.
3. Se cargan tiendas y productos publicados.
4. El usuario usa búsqueda, filtros y mapa.
5. El usuario puede abrir fichas de tienda o producto.

Resultado esperado:

- El usuario puede explorar el catálogo sin autenticarse.

#### UC-UNA-03 - Consultar fichas públicas por URL

Actor:

- Usuario no autenticado

Objetivo:

- Ver contenido público detallado sin iniciar sesión.

Precondiciones:

- Debe existir una tienda, producto o noticia publicada.

Flujo principal:

1. El usuario abre una ficha pública desde la home o por URL directa.
2. La aplicación carga la entidad publicada.
3. El usuario consulta información, imágenes y datos públicos de la tienda o producto.

Nota de navegación:

- la ficha pública de producto usa como URL canónica `/<slug-tienda>/<productId>`
- la ruta legacy `/product/[id]` se mantiene solo como compatibilidad y redirige a la URL canónica

Resultado esperado:

- El usuario puede revisar la oferta antes de decidir si se autentica.

#### UC-UNA-04 - Registrarse o iniciar sesión

Actor:

- Usuario no autenticado

Objetivo:

- Convertirse en comprador o comenzar el onboarding vendedor.

Flujo principal:

1. El usuario navega a `/auth`.
2. Elige comprador o vendedor.
3. Selecciona login o registro.
4. Completa el formulario o usa Google.

Resultado esperado:

- La aplicación crea la sesión o inicia el onboarding del perfil elegido.

### 3.3 Happy path del usuario no autenticado

#### HP-UNA-01 - Entrada estándar y autenticación

1. El usuario entra a la app.
2. Ve la splash.
3. La app detecta que no existe sesión activa.
4. La app redirige a `/home`.
5. El usuario explora tiendas o productos.
6. Decide identificarse para comprar, seguir o gestionar un perfil.
7. Va a `/auth`.
8. Completa login o registro.

Resultado:

- El usuario pasa de exploración pública a sesión autenticada sin romper el recorrido funcional.

## 4. Perfil: Comprador autenticado

### 4.1 Objetivo del perfil

Comprar o reservar productos locales, seguir tiendas, guardar favoritos y gestionar su perfil.

### 4.2 Casos de uso principales

#### UC-CMP-01 - Iniciar sesión como comprador

Actor:

- Comprador

Objetivo:

- Acceder a su cuenta.

Precondiciones:

- El usuario ya dispone de cuenta.

Flujo principal:

1. El usuario entra en `/auth`.
2. Elige el rol comprador.
3. Introduce email y contraseña o usa Google.
4. La aplicación valida la sesión.
5. El usuario es redirigido a la home.

Resultado esperado:

- La sesión queda activa y el perfil comprador disponible.

#### UC-CMP-02 - Mantener perfil comprador

Actor:

- Comprador autenticado

Objetivo:

- Editar su información básica y datos locales de contacto.

Precondiciones:

- Sesión iniciada.

Flujo principal:

1. El usuario entra en `/profile`.
2. Modifica nombre, apellidos, dirección, teléfono o avatar.
3. Guarda los cambios.
4. La app actualiza el perfil remoto y los datos locales complementarios.

Resultado esperado:

- El perfil queda actualizado.

#### UC-CMP-03 - Guardar favoritos y seguir tiendas

Actor:

- Comprador autenticado

Objetivo:

- Conservar referencias de productos y tiendas.

Precondiciones:

- Sesión iniciada.

Flujo principal:

1. El comprador navega por home, ficha de tienda o ficha de producto.
2. Marca productos como favoritos o sigue una tienda.
3. Accede a `/profile`.
4. Consulta sus productos favoritos y tiendas seguidas.

Resultado esperado:

- El usuario recupera fácilmente sus intereses guardados.

#### UC-CMP-04 - Añadir producto al carrito

Actor:

- Comprador autenticado o visitante

Objetivo:

- Preparar una compra.

Precondiciones:

- El producto debe estar publicado y con stock.

Flujo principal:

1. El comprador entra a la ficha de un producto.
2. Selecciona cantidad, color y modo de fulfillment si aplica.
3. Pulsa añadir al carrito.
4. La app valida el stock.
5. El producto se añade al contexto del carrito.

Resultado esperado:

- El carrito refleja el nuevo artículo y la cantidad válida.

#### UC-CMP-05 - Gestionar el carrito

Actor:

- Comprador

Objetivo:

- Ajustar cantidades y modos de entrega o recogida.

Precondiciones:

- Debe haber artículos en el carrito.

Flujo principal:

1. El comprador entra en `/cart`.
2. Cambia cantidades.
3. Cambia entre `pickup` y `delivery` cuando el producto lo permita.
4. El sistema recalcula subtotales, fee comprador y total.
5. Si intenta superar el stock, la app bloquea la acción.

Resultado esperado:

- El carrito queda consistente y listo para checkout.

#### UC-CMP-06 - Crear pedido desde checkout

Actor:

- Comprador autenticado

Objetivo:

- Generar pedidos reales en base de datos.

Precondiciones:

- El usuario debe estar autenticado.
- El carrito no debe contener errores de stock.

Flujo principal:

1. El comprador entra en `/checkout`.
2. Revisa sus artículos.
3. Define el modo de fulfillment por línea.
4. Si hay recogida, elige entre pago total o depósito del 20%.
5. Si hay entrega, confirma dirección.
6. Pulsa el botón de creación de pedido.
7. La aplicación agrupa por tienda y modo.
8. Se crean registros reales en `orders`, `order_items` y tablas relacionadas.

Resultado esperado:

- Quedan creados uno o varios pedidos persistidos.

#### UC-CMP-07 - Reservar con depósito del 20% para recogida

Actor:

- Comprador autenticado

Objetivo:

- Reservar un producto sin pagar el 100% online.

Precondiciones:

- El pedido debe ser de recogida en tienda.

Flujo principal:

1. El comprador llega al checkout con un producto en modo `pickup`.
2. Selecciona la opción `deposit_20`.
3. La aplicación calcula el importe a pagar hoy y el saldo restante.
4. Se crea la reserva asociada al pedido.

Resultado esperado:

- El pedido queda registrado con política de depósito y saldo pendiente en tienda.

### 4.3 Happy paths del comprador

#### HP-CMP-01 - Compra estándar con pago total

1. El comprador inicia sesión.
2. Entra en `/home`.
3. Busca un producto.
4. Abre la ficha del producto.
5. Lo añade al carrito.
6. Entra en `/cart`.
7. Verifica cantidades y modo de entrega.
8. Entra en `/checkout`.
9. Mantiene pago total.
10. Crea el pedido.

Resultado:

- El pedido queda creado correctamente y el usuario ve la confirmación con números de pedido.

#### HP-CMP-02 - Reserva con recogida y depósito

1. El comprador inicia sesión.
2. Añade un producto al carrito.
3. Cambia el modo a recogida en tienda.
4. Entra en `/checkout`.
5. Selecciona depósito del 20%.
6. La app calcula el importe a pagar hoy y el restante en tienda.
7. Crea el pedido.

Resultado:

- Se genera una reserva válida con saldo pendiente.

#### HP-CMP-03 - Seguimiento de intereses

1. El comprador descubre una tienda interesante.
2. Decide seguir la tienda.
3. Marca también uno o varios productos favoritos.
4. Entra en `/profile`.
5. Ve sus tiendas seguidas y sus favoritos.

Resultado:

- El comprador dispone de una lista personal reutilizable para compras futuras.

## 5. Perfil: Vendedor en verificación

### 5.1 Objetivo del perfil

Completar el onboarding vendedor y validar la empresa antes de publicar.

### 5.2 Casos de uso principales

#### UC-VRF-01 - Iniciar registro como vendedor

Actor:

- Usuario con intención de vender

Objetivo:

- Acceder al flujo vendedor.

Precondiciones:

- Ninguna

Flujo principal:

1. El usuario entra en `/auth?role=seller`.
2. Se registra o inicia sesión.
3. La aplicación detecta el rol solicitado.
4. Si no está verificado, redirige a `/siret`.

Resultado esperado:

- El usuario entra en el flujo de verificación vendedor.

#### UC-VRF-02 - Verificar SIRET

Actor:

- Vendedor en verificación

Objetivo:

- Confirmar que la empresa existe y es válida.

Precondiciones:

- Sesión iniciada.

Flujo principal:

1. El usuario introduce un SIRET.
2. La app llama a `/api/siret/verify`.
3. El sistema consulta la API oficial francesa.
4. Si el SIRET existe, devuelve razón social y dirección.
5. El usuario valida identidad y responsabilidad.
6. Se actualiza el perfil como vendedor verificado.

Resultado esperado:

- El perfil queda habilitado para acceder a settings y dashboard vendedor.

#### UC-VRF-03 - Volver temporalmente al rol comprador

Actor:

- Usuario que todavía no desea terminar la verificación

Objetivo:

- Salir del flujo vendedor sin perder la cuenta.

Precondiciones:

- Haber iniciado el flujo vendedor.

Flujo principal:

1. El usuario entra en la pantalla SIRET.
2. Decide continuar más tarde.
3. Cambia de nuevo a comprador.
4. La app lo redirige a `/home`.

Resultado esperado:

- El usuario conserva su cuenta y puede retomar el alta vendedor más adelante.

### 5.3 Happy path del vendedor en verificación

#### HP-VRF-01 - Alta de vendedor exitosa

1. El usuario entra en `/auth?role=seller`.
2. Crea cuenta o inicia sesión.
3. La app lo lleva a `/siret`.
4. Introduce un SIRET válido.
5. La API oficial devuelve los datos de empresa.
6. Confirma identidad y responsabilidad.
7. La app guarda la verificación.
8. El usuario es redirigido a `/settings`.

Resultado:

- El perfil vendedor queda activado y listo para configurar la tienda.

## 6. Perfil: Vendedor verificado

### 6.1 Objetivo del perfil

Configurar su tienda, publicar productos, comunicar novedades y seguir el rendimiento comercial básico.

### 6.2 Casos de uso principales

#### UC-VND-01 - Configurar la tienda

Actor:

- Vendedor verificado

Objetivo:

- Completar los datos públicos y operativos de la tienda.

Precondiciones:

- SIRET verificado
- Sesión iniciada

Flujo principal:

1. El vendedor entra en `/settings`.
2. Completa nombre, categoría, descripción, historia y dirección.
3. Define horarios, apertura en festivos, recogida y entrega.
4. Guarda la configuración.
5. La app geocodifica la dirección y persiste `lat/lng`.

Resultado esperado:

- La tienda queda lista para ser mostrada en el marketplace.

#### UC-VND-02 - Gestionar datos de cuenta y payout

Actor:

- Vendedor verificado

Objetivo:

- Actualizar datos personales, email, contraseña y parámetros de pago.

Precondiciones:

- Sesión iniciada.

Flujo principal:

1. El vendedor entra en la pestaña de cuenta dentro de settings.
2. Edita nombre, email o contraseña.
3. Completa datos bancarios de payout.
4. Guarda los cambios.

Resultado esperado:

- La cuenta queda actualizada y preparada para futuros cobros.

#### UC-VND-03 - Crear o editar productos

Actor:

- Vendedor verificado

Objetivo:

- Publicar y mantener su catálogo.

Precondiciones:

- La tienda debe existir.

Flujo principal:

1. El vendedor entra en `/add-product`.
2. Completa datos del producto.
3. Define stock, precio, color, categorías y modos de fulfillment.
4. Guarda el producto.
5. El producto aparece en el dashboard.

Resultado esperado:

- El catálogo vendedor queda actualizado.

#### UC-VND-04 - Publicar, despublicar o eliminar productos

Actor:

- Vendedor verificado

Objetivo:

- Controlar la disponibilidad de su catálogo.

Precondiciones:

- Debe existir al menos un producto.

Flujo principal:

1. El vendedor entra en `/dashboard`.
2. Ve su lista de productos.
3. Publica, despublica, duplica, edita o elimina según corresponda.
4. La app refresca el listado.

Resultado esperado:

- El estado del catálogo queda alineado con la operación del negocio.

#### UC-VND-05 - Gestionar noticias de tienda

Actor:

- Vendedor verificado

Objetivo:

- Comunicar novedades o promociones.

Precondiciones:

- La tienda debe existir.

Flujo principal:

1. El vendedor entra en `/dashboard`.
2. Completa título, descripción e imagen de una noticia.
3. Publica o guarda cambios.
4. La noticia aparece en el feed si está publicada.

Resultado esperado:

- La tienda dispone de comunicación visible para compradores.

#### UC-VND-06 - Consultar dashboard y seguidores

Actor:

- Vendedor verificado

Objetivo:

- Revisar indicadores básicos de actividad.

Precondiciones:

- La tienda debe existir y el usuario debe estar autenticado.

Flujo principal:

1. El vendedor entra en `/dashboard`.
2. Consulta productos, noticias, seguidores y estadísticas básicas.
3. Accede a la vista pública o preview de su tienda.

Resultado esperado:

- El vendedor obtiene visibilidad operativa mínima de su tienda.

#### UC-VND-07 - Gestionar equipo o presentación de la tienda

Actor:

- Vendedor verificado

Objetivo:

- Mantener datos editoriales de la tienda.

Precondiciones:

- Tienda existente.

Flujo principal:

1. El vendedor entra en settings o dashboard.
2. Edita historia, contenido visual o miembros del equipo.
3. Guarda los cambios.

Resultado esperado:

- La tienda se presenta correctamente en su página pública.

### 6.3 Happy paths del vendedor

#### HP-VND-01 - Configuración inicial completa de tienda

1. El vendedor termina la verificación SIRET.
2. Entra en `/settings`.
3. Completa nombre, categoría, dirección, horarios y modos de entrega.
4. Guarda la tienda.
5. La app geocodifica la dirección.
6. La tienda queda lista para mostrarse en mapa y fichas públicas.

Resultado:

- La tienda queda operativa y visible.

#### HP-VND-02 - Publicación del primer producto

1. El vendedor entra en `/add-product`.
2. Completa ficha del producto.
3. Define stock y precio.
4. Guarda y publica.
5. Entra en `/dashboard`.
6. Ve el producto en su listado y puede abrir la preview.

Resultado:

- El vendedor publica su primer producto end-to-end.

#### HP-VND-03 - Comunicación con el marketplace mediante noticias

1. El vendedor entra en `/dashboard`.
2. Redacta una noticia.
3. Publica la noticia.
4. La noticia aparece en el feed público.
5. Los compradores pueden verla y reaccionar.

Resultado:

- La tienda gana visibilidad dentro de la plataforma.

#### HP-VND-04 - Seguimiento de su comunidad

1. El vendedor entra en `/dashboard`.
2. Consulta el número total de seguidores.
3. Revisa el detalle de las personas que siguen su tienda.
4. Ajusta su contenido o publicaciones según esa señal.

Resultado:

- El vendedor utiliza el dashboard como punto central de seguimiento.

## 7. Reglas de negocio transversales

Estas reglas impactan varios perfiles:

- el stock no puede ser superado ni en producto, ni en carrito, ni en checkout
- la recogida en tienda permite pago total o depósito del 20%
- la entrega y la recogida pueden coexistir en el carrito
- el checkout agrupa pedidos por tienda y por modo de fulfillment
- el acceso vendedor completo depende de un SIRET verificado
- las tiendas y productos publicados son los elementos visibles en la experiencia pública

## 8. Casos que todavía no son flujo cerrado

Los siguientes puntos existen parcialmente o están en evolución:

- pago online real con Stripe
- liquidación o payout efectivo al vendedor
- confirmación final de recepción del pedido por parte del comprador
- mensajería avanzada con flujo operativo completo

Por tanto, los happy paths documentados aquí describen el comportamiento implementado hoy, no el proceso final deseado a nivel marketplace financiero.
