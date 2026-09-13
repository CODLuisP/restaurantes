import { apiFetch } from './client';

export interface Sucursal {
  id: number;
  empresaId: number;
  nombre: string;
  codEstablecimiento?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
  createdAt: string;
  sincronizadoFacturacion: boolean;
}

export interface UpdateSucursalDto {
  nombre: string;
  codEstablecimiento?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  activo: boolean;
}

export interface CreateSucursalDto {
  nombre: string;
  codEstablecimiento?: string | null;
  direccion?: string | null;
  telefono?: string | null;
}

export function getSucursales(token: string) {
  return apiFetch<Sucursal[]>('/api/sucursales', { token });
}

export function getSucursalById(token: string, id: number) {
  return apiFetch<Sucursal>(`/api/sucursales/${id}`, { token });
}

export function createSucursal(token: string, dto: CreateSucursalDto) {
  return apiFetch<Sucursal>('/api/sucursales', { token, method: 'POST', body: dto });
}

export function updateSucursal(token: string, id: number, dto: UpdateSucursalDto) {
  return apiFetch<Sucursal>(`/api/sucursales/${id}`, { token, method: 'PUT', body: dto });
}

/** Series/correlativos propuestos para sincronizar — editables antes de confirmar; lo que se
 *  deje vacío se calcula en el backend a partir del código de establecimiento (código + 1). */
export interface SeriesFacturacionOverride {
  serieFactura?: string;
  correlativoFactura?: number;
  serieBoleta?: string;
  correlativoBoleta?: number;
  serieNotaCreditoFactura?: string;
  correlativoNotaCreditoFactura?: number;
  serieNotaCreditoBoleta?: string;
  correlativoNotaCreditoBoleta?: number;
  serieNotaDebitoFactura?: string;
  correlativoNotaDebitoFactura?: number;
  serieNotaDebitoBoleta?: string;
  correlativoNotaDebitoBoleta?: number;
}

export function sincronizarSucursalFacturacion(token: string, id: number, series?: SeriesFacturacionOverride) {
  return apiFetch<Sucursal>(`/api/sucursales/${id}/sincronizar-facturacion`, { token, method: 'POST', body: series ?? {} });
}

/** Calcula las series por defecto a partir del código de establecimiento (código + 1),
 *  igual que el backend — solo para mostrarlas como ayuda antes de sincronizar. */
export function calcularSeriesPorDefecto(codEstablecimiento: string): Required<Omit<SeriesFacturacionOverride,
  'correlativoFactura' | 'correlativoBoleta' | 'correlativoNotaCreditoFactura' | 'correlativoNotaCreditoBoleta' | 'correlativoNotaDebitoFactura' | 'correlativoNotaDebitoBoleta'>> {
  const cod = parseInt(codEstablecimiento, 10);
  const sufijo = Number.isFinite(cod) ? cod + 1 : 1;
  const pad3 = String(sufijo).padStart(3, '0');
  const pad2 = String(sufijo).padStart(2, '0');
  return {
    serieFactura: `F${pad3}`,
    serieBoleta: `B${pad3}`,
    serieNotaCreditoFactura: `FC${pad2}`,
    serieNotaCreditoBoleta: `BC${pad2}`,
    serieNotaDebitoFactura: `FD${pad2}`,
    serieNotaDebitoBoleta: `BD${pad2}`,
  };
}
