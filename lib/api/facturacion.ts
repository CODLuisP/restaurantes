import { apiFetch, ApiError } from './client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5004';

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
  serieNotaDebitoFactura: string;
  correlativoNotaDebitoFactura: number;
  serieNotaDebitoBoleta: string;
  correlativoNotaDebitoBoleta: number;
  serieGuiaRemision?: string;
  correlativoGuiaRemision?: number;
  serieGuiaTransportista?: string;
  correlativoGuiaTransportista?: number;
  estado: boolean;
}

export function getSeriesFacturacion(token: string) {
  return apiFetch<SeriesSucursal[]>('/api/facturacion/series', { token });
}

/** Campos editables de una sucursal en la API de facturación (series y correlativos). */
export interface EditarSucursalFacturacion {
  nombre?: string;
  direccion?: string;
  telefono?: string;
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
  serieGuiaRemision?: string;
  correlativoGuiaRemision?: number;
  serieGuiaTransportista?: string;
  correlativoGuiaTransportista?: number;
}

export function updateSucursalFacturacion(token: string, sucursalId: number, dto: EditarSucursalFacturacion) {
  return apiFetch<{ exitoso: boolean }>(`/api/facturacion/sucursales/${sucursalId}`, {
    token, method: 'PUT', body: dto,
  });
}

/* ── Empresa: certificado digital, credenciales SOL, entorno ─────────────── */

export interface EmpresaFacturacion {
  ruc: string;
  razonSocial?: string | null;
  nombreComercial?: string | null;
  direccion?: string | null;
  ubigeo?: string | null;
  urbanizacion?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  distrito?: string | null;
  telefono?: string | null;
  email?: string | null;
  environment?: string | null;
  solUsuario?: string | null;
  solClave?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  tieneCertificado: boolean;
  certificadoVigenciaDesde?: string | null;
  certificadoVigenciaHasta?: string | null;
}

export function getEmpresaFacturacion(token: string) {
  return apiFetch<EmpresaFacturacion>('/api/facturacion/empresa', { token });
}

export interface ActualizarEmpresaFacturacion {
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  environment?: string;
  solUsuario?: string;
  solClave?: string;
  clientId?: string;
  clientSecret?: string;
  certificadoPem?: string;
  certificadoPassword?: string;
}

export function updateEmpresaFacturacion(token: string, dto: ActualizarEmpresaFacturacion) {
  return apiFetch<{ exitoso: boolean }>('/api/facturacion/empresa', { token, method: 'PUT', body: dto });
}

/** Paso 1 del wizard: sube el archivo .pfx/.p12 y lo convierte a Base64. No usa apiFetch porque el body es multipart, no JSON. */
export async function convertirCertificadoBase64(token: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(`${API_URL}/api/facturacion/certificado/base64`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.mensaje || 'No se pudo convertir el certificado.', res.status, data);
  return data.base64 as string;
}

/** Paso 2 del wizard: Base64 + contraseña del certificado -> PEM. */
export function convertirCertificadoPem(token: string, base64: string, certPass: string) {
  return apiFetch<{ pem: string }>('/api/facturacion/certificado/pem', {
    token, method: 'POST', body: { base64, certPass },
  });
}
