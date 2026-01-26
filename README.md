# Marketplace Multi-Tenant

Marketplace multi-empresa (multi-tenant) construido con Next.js, PostgreSQL, Prisma y Material UI. Permite a un administrador global crear y gestionar múltiples empresas, cada una con su propio marketplace independiente.

## 🏗️ Arquitectura

Este proyecto sigue una arquitectura multi-tenant basada en `companyId`, donde cada empresa tiene sus propios datos aislados. La aplicación está estructurada en capas claras:

- **Frontend**: Next.js App Router con React Server Components
- **UI**: Material UI (MUI) con temas personalizables por empresa
- **Autenticación**: NextAuth con JWT y soporte para roles
- **Base de datos**: PostgreSQL con Prisma ORM
- **Validación**: Zod para validación de esquemas
- **Seguridad**: Aislamiento de datos por tenant, validación server-side

### Estructura del Proyecto

```
src/
├── app/                      # Next.js App Router
│   ├── (public)/            # Marketplace público por empresa
│   ├── (company)/           # Panel de administración de empresa
│   ├── (admin)/             # Panel de super admin
│   ├── api/auth/            # NextAuth API routes
│   └── auth/                # Páginas de autenticación
├── components/              # Componentes React
│   ├── layout/              # Layouts y navegación
│   ├── marketplace/         # Componentes del marketplace
│   └── cart/                # Componentes de carrito
├── lib/                     # Utilidades y configuraciones
│   ├── prisma.ts            # Cliente Prisma singleton
│   ├── auth.ts              # Configuración NextAuth
│   └── permissions.ts       # Sistema de permisos
└── server/                  # Server Actions y lógica de negocio
    ├── actions/             # Server Actions organizadas
    └── validations/         # Schemas Zod
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Pasos

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd marketplace
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/marketplace"
NEXTAUTH_SECRET="tu-secreto-aqui"
```

4. **Generar cliente Prisma**

```bash
npm run db:generate
```

5. **Ejecutar migraciones**

```bash
npm run db:migrate
```

O para desarrollo rápido:

```bash
npm run db:push
```

6. **Poblar base de datos con datos iniciales**

```bash
npm run db:seed
```

7. **Iniciar servidor de desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 👥 Roles y Permisos

### SUPER_ADMIN

- Acceso completo a todas las empresas
- Crear, editar y eliminar empresas
- Ver métricas globales
- Acceso al panel `/admin/*`

**Credenciales por defecto (seed):**

- Email: `admin@marketplace.com`
- Password: `admin123`

### COMPANY_ADMIN

- Gestionar su propia empresa
- CRUD de productos y categorías
- Gestionar órdenes
- Gestionar usuarios de su empresa
- Configuración de la tienda
- Acceso al panel `/company/*`

**Credenciales por defecto (seed):**

- Email: `admin@demo.com`
- Password: `admin123`

### COMPANY_USER

- Ver y comprar productos
- Gestionar carrito de compras
- Ver historial de órdenes
- Acceso limitado al marketplace público

**Credenciales por defecto (seed):**

- Email: `user@demo.com`
- Password: `user123`

## 📚 Uso

### Marketplace Público

Accede al marketplace de una empresa usando su slug:

```
http://localhost:3000/[companySlug]
```

Por ejemplo, con el seed:

```
http://localhost:3000/demo
```

### Panel de Empresa

Los administradores de empresa pueden acceder a:

- `/company/dashboard` - Dashboard con métricas
- `/company/products` - Gestión de productos
- `/company/categories` - Gestión de categorías
- `/company/orders` - Gestión de órdenes
- `/company/users` - Gestión de usuarios
- `/company/settings` - Configuración de la tienda

### Panel de Super Admin

Los super administradores pueden acceder a:

- `/admin/dashboard` - Dashboard global
- `/admin/companies` - Gestión de empresas

## 🔒 Seguridad

### Aislamiento de Datos Multi-Tenant

- Todas las queries filtran por `companyId`
- Validación server-side obligatoria
- Middleware de protección de rutas
- Funciones helper en Prisma para validar acceso

### Autenticación

- Passwords hasheados con bcrypt
- Sesiones JWT seguras
- Protección CSRF de Next.js
- Callbacks de NextAuth validan permisos

### Validación

- Schemas Zod para todas las entradas
- Validación tanto en cliente como servidor
- Manejo centralizado de errores

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Base de datos
npm run db:generate      # Genera cliente Prisma
npm run db:migrate       # Ejecuta migraciones
npm run db:push          # Sincroniza schema con DB (desarrollo)
npm run db:seed          # Pobla DB con datos iniciales

# Producción
npm run build            # Construye para producción
npm start                # Inicia servidor de producción

# Calidad de código
npm run lint             # Ejecuta ESLint
```

## 📊 Modelo de Datos

El schema Prisma incluye:

- **User**: Usuarios con roles y companyId
- **Company**: Empresas tenant con slug único
- **CompanySettings**: Configuración por empresa
- **Product**: Productos asociados a empresas
- **Category**: Categorías por empresa
- **Cart** / **CartItem**: Carrito de compras
- **Order** / **OrderItem**: Órdenes de compra

## 🔧 Configuración Avanzada

### Tema Personalizado por Empresa

Las empresas pueden personalizar su tema mediante `CompanySettings`:

- Color primario
- Modo claro/oscuro
- Moneda
- Dominio personalizado (futuro)

### Extensión

El proyecto está diseñado para ser extensible:

- Agregar nuevos roles en `UserRole` enum
- Agregar campos a `CompanySettings` para más personalización
- Extender validaciones Zod según necesidades
- Agregar nuevas Server Actions en `src/server/actions/`

## 📝 Consideraciones de Producción

1. **Variables de entorno**: Nunca commitees `.env` con valores reales
2. **Secrets**: Usa secretos seguros para `NEXTAUTH_SECRET` en producción
3. **Base de datos**: Configura conexiones pool y SSL en producción
4. **Logging**: Implementa logging estructurado para producción
5. **Monitoreo**: Agrega herramientas de monitoreo (Sentry, etc.)
6. **Backups**: Configura backups automáticos de PostgreSQL
7. **CDN**: Configura CDN para assets estáticos
8. **Rate limiting**: Implementa rate limiting en APIs públicas

## 🤝 Contribuir

Este es un proyecto base para producción. Para contribuir:

1. Crea una rama para tu feature
2. Implementa cambios con tests si aplica
3. Asegura que el código sigue las convenciones
4. Crea un pull request

## 📄 Licencia

[Especificar licencia aquí]

## 🙏 Créditos

Construido con:

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Material UI](https://mui.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [TypeScript](https://www.typescriptlang.org/)

---

**Nota**: Este proyecto es una base sólida para un SaaS multi-tenant. Está diseñado para escalar y mantenerse en producción con las prácticas adecuadas de seguridad y performance.
