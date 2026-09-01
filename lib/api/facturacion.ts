import { apiFetch } from './client';

export interface SeriesSucursal {
  sucursalId: number;
  empresaRuc: string;
  codEstablecimiento: string;
  nombre: string;
  serieFactura: string;
  correlativoFactura: number;
  serieBoleta: string;
  correlativoBoleta: number;
  serieNotaCreditoFactura: string;
  correlativoNotaCreditoFactura: number;
  serieNotaCreditoBoleta: string;
  correlativoNotaCreditoBoleta: number;
  estado: boolean;
}

export function getSeriesFacturacion(token: string) {
  return apiFetch<SeriesSucursal[]>('/api/facturacion/series', { token });
}
