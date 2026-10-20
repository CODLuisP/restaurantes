import { apiFetch } from './client';

export interface EmpresaDto {
  id: number; nombre: string; ruc: string; direccion?: string | null; logoUrl?: string | null;
  activo: boolean; createdAt: string;
  razonSocial: string; nombreComercial: string;
  departamento: string; provincia: string; distrito: string;
  direccionCompleta?: string | null; condicion?: string | null; estadoContribuyente?: string | null;
  paperSize: string; autoAceptarPedidos: boolean;
  usarFacturacionElectronica: boolean; sincronizadoFacturacion: boolean;
  tieneApiKeyFacturacion: boolean;
  apiKeyFacturacionVenceEn?: string | null;
  /** Solo viene con valor si quien consulta es superadmin; para el resto de roles llega null. */
  apiKeyFacturacion?: string | null;
  /** Dirección propia de la carta: "paikos" → paikos.restofly.com.pe/menu. */
  subdominio?: string | null;
}

export interface UpdateEmpresaDto {
  nombre: string; ruc: string; direccion?: string | null; logoUrl?: string | null; activo: boolean;
  razonSocial?: string | null; nombreComercial?: string | null;
  departamento?: string | null; provincia?: string | null; distrito?: string | null;
  direccionCompleta?: string | null; condicion?: string | null; estadoContribuyente?: string | null;
  paperSize?: string | null; autoAceptarPedidos?: boolean | null;
  usarFacturacionElectronica?: boolean | null;
  /** Solo superadmin puede enviarlo; el backend lo ignora si no lo es. */
  apiKeyFacturacion?: string | null;
  /** Único entre empresas: el backend responde 409 si ya lo usa otra. */
  subdominio?: string | null;
}

/** El PUT reemplaza la empresa completa: parte de los datos actuales para cambiar solo lo indicado. */
export function empresaParaActualizar(e: EmpresaDto, cambios: Partial<UpdateEmpresaDto> = {}): UpdateEmpresaDto {
  return {
    nombre: e.nombre, ruc: e.ruc, direccion: e.direccion ?? null, logoUrl: e.logoUrl ?? null, activo: e.activo,
    razonSocial: e.razonSocial || null, nombreComercial: e.nombreComercial || null,
    departamento: e.departamento || null, provincia: e.provincia || null, distrito: e.distrito || null,
    direccionCompleta: e.direccionCompleta ?? null, condicion: e.condicion ?? null,
    estadoContribuyente: e.estadoContribuyente ?? null,
    paperSize: e.paperSize, autoAceptarPedidos: e.autoAceptarPedidos,
    usarFacturacionElectronica: e.usarFacturacionElectronica,
    subdominio: e.subdominio ?? null,
    ...cambios,
  };
}

export function getMiEmpresa(token: string) {
  return apiFetch<EmpresaDto>('/api/empresas/mi-empresa', { token });
}

export function updateEmpresa(token: string, id: number, dto: UpdateEmpresaDto) {
  return apiFetch<EmpresaDto>(`/api/empresas/${id}`, { token, method: 'PUT', body: dto });
}
