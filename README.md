# Sistema de Inventario y Ganancias

Aplicación web mono-usuario para administrar el inventario y las ganancias de un
negocio pequeño. Responde dos preguntas en cualquier momento: **¿qué tengo en
stock?** y **¿cuánto estoy ganando?**

## Stack

- **Next.js 16** (App Router, TypeScript) + Tailwind CSS + shadcn/ui
- **Supabase** (PostgreSQL + Auth) — la lógica crítica de stock y ventas vive en
  la base de datos (triggers y funciones), garantizando integridad.
- **Vercel** para hosting.

## Vistas

| Vista | Propósito |
|---|---|
| Dashboard | Ingresos, ganancia bruta/neta y gastos del mes; gráfico de ventas de 30 días; alertas de stock bajo. |
| Inventario | CRUD de productos (desactivación en vez de borrado), movimientos manuales e historial. |
| Ventas | Registro rápido con descuento automático de stock (transacción atómica) y listado con detalle. |
| Gastos | Registro y listado con filtros por mes y categoría. |
| Reportes | Ganancia bruta vs neta por rango de fechas, productos más vendidos y exportación CSV. |
| Configuración | Nombre del negocio, categorías y stock mínimo por defecto. |

## Puesta en marcha

### 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa con los valores de tu proyecto
Supabase (Dashboard → Settings → API):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 2. Base de datos

Aplica las migraciones de `supabase/migrations/` **en orden** (0001 → 0003).
Dos opciones:

- **SQL Editor**: pega el contenido de cada archivo en el SQL Editor del
  dashboard de Supabase y ejecútalo.
- **Supabase CLI**: `supabase link --project-ref <ref>` y luego `supabase db push`.

### 3. Usuario único

1. En el dashboard: **Authentication → Users → Add user** — crea tu usuario con
   email y contraseña (marca *Auto Confirm User*).
2. En **Authentication → Sign In / Up**, desactiva *Allow new users to sign up*
   para que nadie más pueda registrarse.

### 4. Desarrollo local

```bash
npm install
npm run dev
```

### 5. Deploy en Vercel

1. Sube el repositorio a GitHub y conéctalo en [vercel.com](https://vercel.com).
2. Agrega las dos variables de entorno del paso 1 en el proyecto de Vercel.
3. Deploy. Todas las rutas quedan protegidas por login salvo `/login`.

## Notas de diseño

- **El stock nunca se edita a mano**: se deriva de los movimientos de inventario
  (un trigger lo actualiza y un `CHECK` impide stock negativo).
- **Las ventas son atómicas**: la función `create_sale` crea la venta, su
  detalle y los movimientos de salida en una sola transacción; si falta stock,
  no queda nada a medias.
- **Snapshot de precios**: cada línea de venta guarda el precio y costo del
  momento, así los reportes históricos no cambian al editar un producto.
- **Zona horaria**: los reportes agrupan por día en hora de Chile
  (`America/Santiago`); la moneda es CLP sin decimales.
