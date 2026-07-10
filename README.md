<div align="center">

# 🍽️ RestoPro — SaaS POS Perú

**Sistema de gestión integral para restaurantes**
Punto de venta, comandas, cocina en tiempo real, caja, facturación (SUNAT) y menú digital con QR.

Construido con **Next.js 15 · React 19 · TypeScript · Tailwind CSS 4**

</div>

---

## 📋 Tabla de contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Stack tecnológico](#-stack-tecnológico)
- [Requisitos previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Variables de entorno](#-variables-de-entorno)
- [Cuentas de demostración](#-cuentas-de-demostración)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Roles y permisos](#-roles-y-permisos)
- [Flujo operativo](#-flujo-operativo)
- [Scripts disponibles](#-scripts-disponibles)

---

## 📖 Descripción

**RestoPro** es una plataforma tipo SaaS para la gestión completa de un restaurante, pensada para el mercado peruano (soles, boletas/facturas SUNAT, Yape/Plin). Cubre todo el ciclo operativo: el mozo toma la comanda desde el **Comandero**, la orden llega en tiempo real al **KDS de Cocina**, el cajero **cobra** y emite el comprobante, y todo el efectivo queda controlado en la **Caja** con arqueo por turnos.

Incluye además un **menú digital público** que los comensales consultan escaneando un **código QR** en la mesa.

> Los datos se manejan del lado del cliente (React Context + `localStorage`) sobre datos semilla (`data/mockData.ts`), lo que permite probar toda la aplicación sin necesidad de un backend.

---

## ✨ Características

| Módulo | Descripción |
|--------|-------------|
| 🏠 **Dashboard** | KPIs del día: ventas, pedidos activos, ticket promedio, clientes atendidos, y gráfico de ingresos. |
| 🪑 **Mesas** | Distribución del salón por pisos, mesas dinámicas, **unir/separar mesas**, reservar/liberar y estados (disponible/ocupada/reservada). |
| 🛒 **Comandero** | Toma de pedidos en mesa, para llevar y delivery. Panel de detalle inline, edición y cancelación de comandas. Integración con **Google Maps** para direcciones de delivery. |
| 🧾 **Cobrar** | Cobro del consumo, selección de método de pago y emisión de Boleta/Factura. |
| 👨‍🍳 **Cocina (KDS)** | Cola de comandas en tiempo real con estados (pendiente → preparando → listo) y cronómetro. |
| 🔔 **Por despachar** | El mozo confirma la entrega de las comandas listas. |
| 💰 **Caja** | Apertura de turno, movimientos (ingresos/egresos), arqueo y cierre con control de faltantes/sobrantes entre turnos. |
| 📖 **Menú Digital** | Carta del día editable, banners, página de bienvenida e importación de productos. Generación de **QR** por mesa. |
| 🤖 **Análisis de platos con IA** | Sube una foto de un plato y **Gemini** genera nombre, descripción y categoría automáticamente. |
| 👥 **Clientes (CRM)** | Registro de clientes, historial de compras y segmentación. |
| 🛡️ **Personal** | Gestión de usuarios y roles (admin/cajero/mozo). |
| 📈 **Reportes** | Métricas de ventas y desempeño (Recharts). |
| ⚙️ **Configuración** | Información del negocio, métodos de pago/entrega, zonas de entrega, tickets, tracking, dominio y plan. |

---

## 🛠 Stack tecnológico

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **UI:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Iconos:** [lucide-react](https://lucide.dev/)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Animaciones:** [Motion](https://motion.dev/)
- **Mapas:** [@react-google-maps/api](https://react-google-maps-api-docs.netlify.app/) (Maps + Geocoding + Places)
- **QR:** [qrcode.react](https://www.npmjs.com/package/qrcode.react)
- **IA:** Google **Gemini** (`gemini-2.5-flash`) vía API Route
- **Estado:** React Context + `localStorage`
- **Fuentes:** Inter + JetBrains Mono (`next/font`)

---

## 📦 Requisitos previos

- **Node.js** 18.18 o superior
- **npm** (o pnpm / yarn)

---

## 🚀 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (ver sección siguiente)
cp .env.example .env.local

# 3. Levantar el servidor de desarrollo
npm run dev
```

La aplicación quedará disponible en **http://localhost:3000**.

---

## 🔐 Variables de entorno

Crea un archivo `.env.local` en la raíz basándote en `.env.example`:

```env
# Requerida para el análisis de platos con IA (Gemini)
GEMINI_API_KEY="tu_api_key_de_gemini"

# URL donde se hospeda la app (links autorreferenciales, callbacks)
APP_URL="http://localhost:3000"

# Requerida para el mapa de delivery (Maps JS + Geocoding + Places habilitadas)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="tu_api_key_de_google_maps"
```

> `GEMINI_API_KEY` es secreta (solo servidor). `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` se expone al cliente, restríngela por dominio en Google Cloud Console.

---

## 👤 Cuentas de demostración

Puedes ingresar con correo o con **PIN rápido**:

| Rol | Nombre | Email | PIN |
|-----|--------|-------|-----|
| 🛡️ Admin | Carlos Cabrera | `carlos.cabrera@restopro.pe` | `1092` |
| 💰 Cajero | Miguel Prado | `miguel.prado@restopro.pe` | `4480` |
| 🧑‍🍳 Mozo | Lucía Mendoza | `lucia.mendoza@restopro.pe` | `2540` |

---

## 📁 Estructura del proyecto

```
restufly/
├── app/
│   ├── (dashboard)/            # Rutas protegidas (layout con Sidebar + TopBar)
│   │   ├── dashboard/          # KPIs y gráficos
│   │   ├── mesas/              # Distribución del salón
│   │   ├── comandero/          # Toma de pedidos
│   │   ├── cobrar/             # Cobro y facturación
│   │   ├── cocina/             # KDS de cocina
│   │   ├── despachar/          # Comandas por despachar
│   │   ├── caja/               # Apertura, arqueo y cierre
│   │   ├── carta/              # Menú digital y QR
│   │   ├── clientes/           # CRM
│   │   ├── usuarios/           # Personal y roles
│   │   ├── reportes/           # Reportes de venta
│   │   ├── configuracion/      # Ajustes del negocio
│   │   └── ui-components/      # Showcase de componentes UI
│   ├── api/
│   │   └── analizar-plato/     # API Route: análisis de imagen con Gemini
│   ├── menu/[mesaId]/          # Menú público (accesible por QR)
│   ├── layout.tsx              # Layout raíz (fuentes + AuthProvider)
│   └── page.tsx                # Pantalla de login
├── components/
│   ├── layout/                 # Sidebar, TopBar, AuthGuard, MainArea
│   ├── ui/                     # Button, Modal, Input, Toast, Badge, etc.
│   ├── carta/                  # Tabs del menú digital (Productos, Banners, QR...)
│   ├── clientes/               # Modales y segmentación de clientes
│   ├── configuracion/          # Ajustes (negocio, tickets)
│   ├── dashboard/              # RevenueChart
│   ├── mesas/                  # RestaurantTable
│   └── Login.tsx               # Autenticación (email / PIN)
├── context/                    # Estado global (React Context)
│   ├── AppContext.tsx          # Mesas, pedidos, caja, cocina, ventas
│   ├── AuthContext.tsx         # Sesión, usuarios y roles
│   ├── CartaContext.tsx        # Carta del día
│   ├── BannersContext.tsx      # Banners del menú digital
│   └── SidebarContext.tsx      # Estado del sidebar
├── data/mockData.ts            # Datos semilla (usuarios, productos, pedidos...)
├── types/index.ts              # Tipos TypeScript del dominio
├── public/                     # Imágenes estáticas
└── .env.example                # Plantilla de variables de entorno
```

---

## 🔑 Roles y permisos

El acceso a cada módulo se controla por rol (`components/layout/Sidebar.tsx`):

| Módulo | Admin | Cajero | Mozo |
|--------|:-----:|:------:|:----:|
| Dashboard | ✅ | ✅ | ✅ |
| Mesas | ✅ | ✅ | ✅ |
| Comandero | ✅ | — | ✅ |
| Cobrar | ✅ | ✅ | — |
| Cocina | ✅ | ✅ | ✅ |
| Por despachar | ✅ | — | ✅ |
| Caja | ✅ | ✅ | — |
| Menú Digital | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | — |
| Personal | ✅ | — | — |
| Reportes | ✅ | ✅ | — |
| Configuración | ✅ | — | — |

---

## 🔄 Flujo operativo

```
1. Cajero/Admin apertura la CAJA (registra fondo inicial)
        ↓
2. Mozo toma el pedido en el COMANDERO (mesa / llevar / delivery)
        ↓
3. La comanda llega al KDS de COCINA (pendiente → preparando → listo)
        ↓
4. El mozo confirma la entrega en POR DESPACHAR
        ↓
5. El cajero COBRA el consumo y emite Boleta/Factura → la mesa se libera
        ↓
6. Al final del turno, se cierra la CAJA con arqueo (control de faltantes/sobrantes)
```

---

## 📜 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Genera el build de producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | Ejecuta el linter de Next.js. |

---

<div align="center">

**RestoPro** · Gestión gastronómica inteligente 🇵🇪

</div>
