# Documentacion Tecnica - Lovcal

## 1. Objetivo del proyecto

Lovcal es una aplicacion marketplace orientada al comercio local. Permite:

- descubrir tiendas cercanas y productos publicados
- gestionar perfiles comprador y vendedor
- verificar vendedores mediante SIRET (CUIT)
- seguir tiendas, marcar productos favoritos y consultar noticias de tienda
- gestionar un carrito con modos de entrega o recogida
- crear pedidos reales en base de datos antes de la integracion final del pago

La aplicacion esta construida como una aplicacion web Next.js con App Router, donde la mayoria de la logica de interfaz vive en componentes cliente.

Comportamiento de acceso actual:

- un usuario sin sesion puede entrar en la experiencia publica desde `/`
- la splash redirige a usuarios autenticados a `/home` o `/dashboard`, y a usuarios anonimos a `/home`
- las acciones privadas o sensibles siguen enviando a `/auth`

## 2. Stack tecnologico

- Framework: Next.js 16 con App Router
- UI: React 19
- Lenguaje: TypeScript con `strict: true`
- Estilos: Tailwind CSS 4 + estilos globales propios
- Componentes UI: Radix UI + componentes locales en `src/app/components/ui` y `src/app/components/ds`
- Animacion: `motion`
- Mapa: `leaflet` + `react-leaflet`
- Persistencia y autenticacion: Supabase
- Calidad: ESLint, Prettier, Jest, Testing Library

Archivos clave:

- [package.json](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/package.json)
- [tsconfig.json](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/tsconfig.json)
- [next.config.mjs](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/next.config.mjs)
- [jest.config.mjs](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/jest.config.mjs)

## 3. Arquitectura general

La arquitectura sigue una separacion bastante clara entre:

- `app/`: rutas Next.js
- `src/app/components/screens`: pantallas funcionales
- `src/app/components`: contextos, navegacion y componentes de soporte
- `src/app/services`: acceso a datos y logica de integracion con Supabase o APIs externas
- `src/app/types`: contratos TypeScript del dominio
- `src/app/data`: catalogos estaticos y datos base
- `supabase/`: esquema SQL y documentacion de configuracion

### 3.1 Capa de rutas

Las rutas de `app/` son finas: normalmente renderizan una pantalla de `src/app/components/screens/*`.

Ejemplos:

- [app/home/page.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/home/page.tsx)
- [app/checkout/page.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/checkout/page.tsx)
- [app/dashboard/page.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/dashboard/page.tsx)
- [app/[shopSlug]/[productId]/page.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/[shopSlug]/[productId]/page.tsx)
- [app/product/[id]/page.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/product/[id]/page.tsx)
- [app/shop/[id]/page.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/shop/[id]/page.tsx)

La mayoria de las paginas exportan `dynamic = "force-dynamic"`, lo que evita cache estatico y fuerza carga dinamica.

En el caso del detalle de producto:

- la URL publica canonica es `/<shopSlug>/<productId>`
- la ruta legacy `/product/[id]` sigue existiendo como compatibilidad y redirige a la URL canonica cuando el producto es publico

### 3.2 Layout global

El layout principal:

- importa los estilos globales
- monta los providers globales
- inyecta la barra de navegacion inferior

Archivo:

- [app/layout.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/layout.tsx)

### 3.3 Providers globales

La composicion de providers vive en:

- [app/providers.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/providers.tsx)

Orden actual:

1. `AuthProvider`
2. `LocationProvider`
3. `CartProvider`

Esto significa que autenticacion, ubicacion y carrito estan disponibles en toda la aplicacion.

## 4. Modulos funcionales principales

### 4.1 Autenticacion y roles

Archivo principal:

- [AuthContext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/AuthContext.tsx)

Responsabilidades:

- login con email y password
- login con Google
- signup
- gestion de sesion Supabase
- refresh de token
- lectura y sincronizacion del perfil `profiles`
- cambio de rol `buyer` / `seller`
- verificacion SIRET
- actualizacion de email y password

Detalles tecnicos:

- la sesion se persiste en `localStorage`
- se usa `fetch` directo contra Supabase Auth y Supabase REST
- el perfil funcional se hidrata a partir de `auth.users` + `public.profiles`
- cuando un vendedor entra en sesion, se puede disparar el backfill de coordenadas de su tienda

### 4.2 Ubicacion

Archivo principal:

- [LocationContext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/LocationContext.tsx)

Responsabilidades:

- mantener la ubicacion actual del usuario
- persistirla en `localStorage`
- intentar obtener geolocalizacion del navegador
- hacer reverse geocoding para resolver ciudad, codigo postal y departamento

Comportamiento por defecto:

- la ubicacion inicial es Amiens

### 4.3 Carrito

Archivo principal:

- [CartContext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/CartContext.tsx)

Responsabilidades:

- almacenar lineas del carrito
- soportar `pickup` y `delivery`
- controlar cantidades
- impedir cantidades superiores al stock disponible
- calcular `subtotal`, `buyerFee` y `total`

Reglas actuales:

- `buyerFee` = 2% del subtotal
- una linea del carrito se identifica por producto y color
- el carrito normaliza automaticamente cantidades invalidas o superiores al stock

### 4.4 Catalogo, tiendas y productos

Archivo principal:

- [catalog.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/catalog.ts)

Responsabilidades:

- leer tiendas publicadas desde Supabase
- leer productos publicados
- mapear filas SQL a tipos TypeScript del front
- soportar fetch parcial por tienda o por producto
- manejar errores de esquema y timeouts de Supabase

Tipos asociados:

- [catalog.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/types/catalog.ts)

### 4.5 Configuracion de tienda

Archivo principal:

- [shopSettings.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/shopSettings.ts)

Responsabilidades:

- lectura y escritura de parametros de tienda
- geocodificacion de direccion
- mantenimiento de `lat` y `lng`
- gestion de modos de entrega
- soporte de datos enriquecidos de tienda

### 4.6 Mapa

Archivo principal:

- [ShopMap.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/ShopMap.tsx)

Responsabilidades:

- renderizar el mapa con Leaflet
- mostrar la posicion del usuario y las tiendas
- reaccionar a cambios de centro
- geocodificar en cliente tiendas que todavia no tengan coordenadas persistidas

Dependencias externas:

- tiles CARTO / OpenStreetMap
- `api-adresse.data.gouv.fr` para geocodificacion fallback

### 4.7 Checkout y pedidos

Pantalla:

- [CheckoutScreenNext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/screens/CheckoutScreenNext.tsx)

Servicios y tipos:

- [orders.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/orders.ts)
- [orders.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/types/orders.ts)

Estado actual:

- el checkout ya crea pedidos reales en base de datos
- divide la compra por tienda y por modo de fulfillment
- soporta `full_payment` y `deposit_20` para recogida en tienda
- crea registros en `orders`, `order_items`, `shipments` y `pickup_reservations` segun el caso

Limitacion importante:

- Stripe todavia no esta integrado
- los pedidos quedan creados en estado funcional de pre-pago, pero el cobro real no esta conectado

### 4.8 Noticias, seguidores, favoritos y analitica

Servicios relevantes:

- [shopNews.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/shopNews.ts)
- [shopFollowers.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/shopFollowers.ts)
- [buyerCollections.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/buyerCollections.ts)
- [leadEvents.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/leadEvents.ts)
- [ads.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/ads.ts)

Cubren:

- feed de noticias de tienda
- likes de noticias
- seguimiento de tiendas
- favoritos de productos
- anuncios locales
- eventos de leads

## 5. Rutas funcionales principales

Rutas clave expuestas por Next.js:

- `/` splash screen
- `/home` home con mapa, descubrimiento y filtros
- `/auth` autenticacion
- `/profile` perfil comprador
- `/dashboard` panel vendedor
- `/settings` configuracion de tienda y cuenta
- `/add-product` alta de producto
- `/cart` carrito
- `/checkout` checkout
- `/news` feed de noticias
- `/messages` mensajeria
- `/siret` verificacion vendedor
- `/<shopSlug>/<productId>` detalle publico canonico de producto
- `/product/[id]` ruta legacy de compatibilidad con redireccion al detalle canonico
- `/shop/[id]` detalle de tienda
- `/shop/[id]/news` noticias de una tienda
- `/shop/[id]/news/[newsId]` detalle de noticia

## 6. Modelo de datos en Supabase

Archivo principal:

- [schema.sql](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/supabase/schema.sql)

### 6.1 Dominios principales

#### Taxonomia

- `category_groups`
- `categories`

#### Identidad y vendedores

- `profiles`
- `shops`

Reglas destacadas:

- un SIRET solo puede pertenecer a un perfil
- una tienda puede estar asociada a un unico `owner_user_id`

#### Marketplace

- `products`
- `shop_collections`
- `favorite_products`
- `followed_shops`
- `shop_news`
- `shop_news_likes`

#### Analitica y publicidad

- `lead_events`
- `ads`
- `ad_impressions`
- `ad_clicks`

#### Pedidos y pagos

- `orders`
- `order_items`
- `payment_attempts`
- `shipments`
- `pickup_reservations`
- `payouts`

### 6.2 Tipos enum del dominio de pedidos

El esquema define enums para:

- tipo de fulfillment
- politica de pago
- estado de pedido
- estado de pago
- estado de payout
- estado de shipment
- metodo de entrega
- scope de intento de pago

Esto evita strings libres y formaliza el flujo del marketplace.

### 6.3 Seguridad

El esquema activa RLS en las tablas publicas principales.

En general:

- datos publicos como catalogo y noticias publicadas son legibles por todos
- los compradores solo leen o modifican sus propios recursos
- los vendedores solo gestionan sus propias tiendas, productos, noticias y pedidos asociados

## 7. Integraciones externas

### 7.1 Supabase

Uso actual:

- autenticacion via `/auth/v1/*`
- acceso a datos via `/rest/v1/*`
- politicas RLS para aislamiento de datos

Variables necesarias en runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 7.2 Verificacion SIRET

Ruta interna:

- [app/api/siret/verify/route.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/api/siret/verify/route.ts)

La ruta:

- recibe un SIRET
- consulta `recherche-entreprises.api.gouv.fr`
- devuelve nombre de empresa y direccion normalizados

### 7.3 Geocodificacion

Servicios utilizados:

- `geo.api.gouv.fr` para reverse geocoding de la posicion del usuario
- `api-adresse.data.gouv.fr` para geocodificar direcciones de tienda

## 8. Flujo funcional resumido

### 8.1 Flujo comprador

1. entra en `/home`
2. la aplicacion resuelve ubicacion
3. carga tiendas y productos publicados
4. el usuario consulta tiendas o productos
5. agrega productos al carrito
6. pasa por `/checkout`
7. el sistema crea pedidos reales en Supabase

### 8.2 Flujo vendedor

1. crea cuenta o entra con Google
2. valida su rol vendedor
3. verifica SIRET
4. completa parametros de tienda
5. publica productos y noticias
6. consulta el dashboard con estadisticas y seguidores

## 9. Comandos de desarrollo

Comandos disponibles:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run format`
- `npm run format:check`

## 10. Calidad y pruebas

Herramientas actuales:

- ESLint para calidad estatica
- TypeScript strict para coherencia de tipos
- Jest + Testing Library para pruebas unitarias

Cobertura observada:

- la cobertura de tests todavia es limitada
- existe al menos una prueba en `src/app/components/ds/__tests__`
- la mayor parte de los flujos de negocio todavia dependen de validacion manual

## 11. Limitaciones actuales

- el pago online con Stripe todavia no esta implementado
- gran parte de la logica de negocio vive en cliente
- el acceso a Supabase se hace en buena parte desde el front mediante REST
- algunos procesos complejos, como el checkout multi-pedido, todavia no son transaccionales de extremo a extremo
- la geocodificacion fallback en cliente sigue existiendo para tiendas sin coordenadas persistidas

## 12. Recomendaciones tecnicas siguientes

- integrar Stripe Connect y webhooks para cerrar el flujo de pago
- mover logica critica de negocio a rutas server o funciones backend
- ampliar la cobertura de tests de servicios, contextos y checkout
- separar mejor el dominio marketplace en modulos server/client
- documentar formalmente los estados del pedido y payout

## 13. Archivos de referencia recomendados

- [README.md](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/README.md)
- [app/layout.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/layout.tsx)
- [app/providers.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/app/providers.tsx)
- [AuthContext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/AuthContext.tsx)
- [LocationContext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/LocationContext.tsx)
- [CartContext.tsx](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/components/CartContext.tsx)
- [catalog.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/catalog.ts)
- [shopSettings.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/shopSettings.ts)
- [orders.ts](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/src/app/services/orders.ts)
- [schema.sql](/Users/bafiana/MonCadeauLocal/Moncadeaulocalmarketplaceapp/supabase/schema.sql)
