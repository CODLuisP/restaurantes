# Carta pública: subdominio, nombre y logo — cambios pendientes en RestaurantesAPI

El frontend ya está listo para:

1. Mostrar el **nombre del negocio** y el **logo** en la pestaña del navegador (y en la vista previa de WhatsApp) al abrir la carta pública.
2. Servir la carta de cada empresa en su **subdominio**: `https://paikos.restofly.com.pe/menu`.

Ambas cosas necesitan los cambios de abajo en el backend. Mientras no estén, el frontend sigue funcionando como antes: la pestaña muestra el nombre de la sucursal y el QR usa `/menu?sucursalId=N`.

## 1. Columna `Subdominio` en `Empresas`

- `varchar(40)`, `NULL`, **índice único** (las empresas sin subdominio quedan en `NULL`).
- Se guarda siempre en minúsculas.
- Validación (la misma que hace el frontend en `lib/menu/subdominio.ts`):
  - regex `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$` y sin `--`;
  - nombres reservados: `www, app, api, admin, panel, dashboard, login, registro, menu, carta, mail, correo, smtp, ftp, cdn, static, assets, img, imagenes, blog, ayuda, soporte, help, docs, status, dev, test, demo, staging, restofly, superadmin`.

## 2. `PUT /api/empresas/{id}` y `GET /api/empresas/mi-empresa`

- `UpdateEmpresaDto` acepta `subdominio` (string o `null`). `EmpresaDto` lo devuelve.
- Si otra empresa ya lo usa: **409 Conflict** con `{ "message": "Esa dirección ya la usa otro negocio." }`.
- Si no cumple el formato: 400 con el motivo.

> El frontend envía siempre el subdominio actual en el PUT, para no borrarlo al guardar otros datos de la empresa.

## 3. Nuevo `GET /api/publico/resolver?subdominio=paikos` (anónimo)

Respuesta `200`:

```json
{
  "empresaId": 7,
  "sucursalId": 1,
  "sucursales": [{ "id": 1, "nombre": "Principal" }, { "id": 4, "nombre": "Los Olivos" }],
  "nombreComercial": "Paikos Chicken",
  "razonSocial": "PAIKOS CHICKEN S.R.L.",
  "logoUrl": "https://…"
}
```

- `sucursalId`: la sucursal que se muestra por defecto (la principal o la primera activa).
- `sucursales`: solo las activas de esa empresa. El frontend acepta `?sucursalId=` únicamente si está en esta lista, para que ninguna empresa pueda mostrar la carta de otra bajo su subdominio.
- `404` si el subdominio no existe o la empresa está inactiva.
- Conviene cachearla, porque se consulta en cada visita a la carta.

## 4. `GET /api/publico/sucursal?sucursalId=N`: agregar datos de la empresa

Agregar a la respuesta actual (`nombre`, `direccion`, `telefono`):

```json
{ "nombreComercial": "Paikos Chicken", "razonSocial": "PAIKOS CHICKEN S.R.L." }
```

Así la pestaña muestra "Paikos Chicken" también cuando la carta se abre por `/menu?sucursalId=N` o por el QR de una mesa.

## Infraestructura (hosting del frontend)

- DNS: registro comodín `*.restofly.com.pe` apuntando al hosting del frontend, más un certificado SSL comodín (en Vercel basta con agregar el dominio `*.restofly.com.pe` al proyecto con los nameservers de Vercel).
- Variable `NEXT_PUBLIC_DOMINIO_BASE=restofly.com.pe` en el frontend.
- En desarrollo no hace falta nada: `http://paikos.localhost:3000/menu` ya funciona en Chrome y Edge.
