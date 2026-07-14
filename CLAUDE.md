# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js default port 3000; this repo's .claude/launch.json pins it to 3001)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # next lint
```

There is no test suite configured in this repo (no test script, no test runner dependency). Type-check manually with `npx tsc --noEmit` since `npm run build` alone will not catch every type error surfaced during development.

## Environment

Copy `.env.example` to `.env.local` before running. Key variables:

- `API_URL` / `NEXT_PUBLIC_API_URL` — base URL of the external **RestaurantesAPI** (.NET) backend. `API_URL` is used server-side only (NextAuth); `NEXT_PUBLIC_API_URL` is used by client components that call the backend directly.
- `AUTH_SECRET` — NextAuth JWT signing secret.
- `GEMINI_API_KEY` — server-side only, used by `/api/analizar-plato`.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — client-exposed, used for delivery address maps in Comandero.
- `SUNAT_API_URL` / `SUNAT_API_TOKEN` — optional OSE/SUNAT invoicing provider for `/api/emitir-comprobante`. If unset, that endpoint runs in demo mode and simulates acceptance.

If the dev server needs a clean restart after moving/deleting routes, delete `.next` first — stale route type declarations under `.next/types` can produce phantom `tsc` errors after a route rename/removal.

## Architecture: two data sources, don't mix them up

This app is mid-migration from a fully mock/client-side prototype to a real backend, and **both patterns coexist**. Know which one a feature uses before touching it:

1. **Real backend (RestaurantesAPI, .NET) via NextAuth** — used for authentication, users/roles, and Clientes (CRM). Auth is `next-auth` v5 (`auth.ts`) with a `Credentials` provider that calls `${API_URL}/api/auth/login`, stores `accessToken`/`refreshToken` in the JWT, and auto-refreshes via `refreshAccessToken()` in the `jwt` callback. Client components that need the backend call it two ways:
   - Typed wrappers in `lib/api/*.ts` (e.g. `lib/api/usuarios.ts`) built on `apiFetch` (`lib/api/client.ts`), which take a `token` param.
   - Feature hooks in `hooks/<feature>/` (e.g. `hooks/clientes/useClientes.ts`) that pull `session.accessToken` via `useSession()` and fetch directly.
   Both need `session.accessToken`; check `session.error === 'RefreshAccessTokenError'` before trusting a session.

2. **Client-only mock state (React Context + localStorage)** — everything else: mesas/pisos, comandero orders, cocina (KDS), caja (cash sessions), ventas/sales history, carta del día, banners, business info, payment methods. Seeded from `data/mockData.ts`. The main context is `context/AppContext.tsx` (~950 lines — tables, orders, kitchen queue, cash register, sales), split further into `CartaContext`, `BannersContext`, `BusinessContext`, `PaymentMethodsContext`, `SidebarContext`. Each persists its own slice under a `restopro.*` localStorage key (hydrated in a `useEffect`, written on every change). There is no server sync for this half of the app — refreshing the browser is the only persistence layer.

When adding a new domain feature, decide up front which pattern it belongs to instead of defaulting to whichever is closer in the file you're editing.

## Route structure

- `app/(dashboard)/*` — authenticated app shell (`Sidebar` + `TopBar`, wrapped in all the client Context providers plus `AuthGuard`). Route folders map 1:1 to sidebar items in `components/layout/Sidebar.tsx`; `menuItems[].roles` gates visibility per `Role` (`admin | cajero | mozo | cocinero | repartidor`). `configSubItems` lists the `/configuracion/*` sub-pages separately since they render under one collapsible nav section.
- `app/api/*` — Next.js Route Handlers: `auth/[...nextauth]` (NextAuth), `analizar-plato` (Gemini image analysis), `emitir-comprobante` (SUNAT invoicing, demo-mode fallback).
- `app/menu/[mesaId]/` and `app/menu/` — public menu pages (no auth), reachable via the QR code customers scan at their table. `middleware.ts` explicitly whitelists `/`, `/menu*`, and `/api*` as public; every other path redirects to `/` when there's no session, and `/` redirects to `/dashboard` when already authenticated.
- `app/page.tsx` — login screen (`components/auth/LoginForm.tsx`), supports both credentials and quick-PIN.

`AuthGuard` (`components/auth/AuthGuard.tsx`) adds one more gate on top of the middleware: a `mozo` cannot use the dashboard while the cash register (`caja`) is closed.

## Styling

Tailwind CSS 4 with a custom design-token layer in `app/design-tokens.css` (`@theme` block) — component classes like `.card`, `.card-lg`, `.btn-primary/secondary/ghost/danger`, `.input`, `.badge-*` are defined there, not ad-hoc Tailwind utility soup. Prefer these over recreating the same look with raw utilities, and change the underlying `--color-*`/`--radius-*`/`--shadow-*` token if a global restyle is needed rather than hunting through components.

## Conventions worth knowing

- Path alias `@/*` maps to the repo root (see `tsconfig.json`).
- Spanish is the language of the entire UI, in-code comments, and toast messages — match it in new code.
- `useApp()` (`AppContext`) also owns the global toast system (`triggerToast`) — most features surface errors/success through it rather than inline banners.
- `types/index.ts` holds the shared domain model (`Table`, `Piso`, `KitchenOrder`, `ActiveOrder`, `CashSession`, `Role`, `User`, etc.) for the mock-state half of the app; `types/clientes.ts` and `next-auth.d.ts` (module augmentation for `session.accessToken`/`session.error`) cover the real-backend half.
