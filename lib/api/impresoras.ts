import { apiFetch } from './client';

export type AreaImpresora = 'cocina' | 'barra' | 'caja';
export type ConexionImpresora = 'red' | 'usb';
export type AnchoPapel = '58mm' | '80mm';

export interface ImpresoraDto {
  id: number;
  sucursalId: number;
  nombre: string;
  area: AreaImpresora;
  conexion: ConexionImpresora;
  ip?: string | null;
  puerto: number;
  /** Nombre de la impresora en Windows (solo conexión USB). */
  nombreSistema?: string | null;
  anchoPapel: AnchoPapel;
  activo: boolean;
}

export interface CreateImpresoraDto {
  /** Solo lo usa un superadmin; el resto de roles queda fijo a su sucursal. */
  sucursalId?: number;
  nombre: string;
  area: AreaImpresora;
  conexion: ConexionImpresora;
  ip?: string | null;
  puerto: number;
  nombreSistema?: string | null;
  anchoPapel: AnchoPapel;
}

export type UpdateImpresoraDto = Omit<CreateImpresoraDto, 'sucursalId'> & { activo: boolean };

export interface AgenteTokenDto {
  sucursalId: number;
  token: string;
  expiraEn: string;
}

export function getImpresoras(token: string, sucursalId?: number | null) {
  const qs = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<ImpresoraDto[]>(`/api/impresoras${qs}`, { token });
}

export function createImpresora(token: string, dto: CreateImpresoraDto) {
  return apiFetch<ImpresoraDto>('/api/impresoras', { token, method: 'POST', body: dto });
}

export function updateImpresora(token: string, id: number, dto: UpdateImpresoraDto) {
  return apiFetch<ImpresoraDto>(`/api/impresoras/${id}`, { token, method: 'PUT', body: dto });
}

export function deleteImpresora(token: string, id: number) {
  return apiFetch<void>(`/api/impresoras/${id}`, { token, method: 'DELETE' });
}

/** Genera el token con el que el agente de impresión de la sucursal se conecta a la API. */
export function generarTokenAgente(token: string, sucursalId?: number | null) {
  const qs = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return apiFetch<AgenteTokenDto>(`/api/impresion/token-agente${qs}`, { token, method: 'POST' });
}
