import { apiFetch } from './client';

export interface EmpresaDto {
  id: number; nombre: string; ruc: string; direccion?: string | null; logoUrl?: string | null;
  activo: boolean; createdAt: string;
  razonSocial: string; nombreComercial: string;
  departamento: string; provincia: string; distrito: string;
  direccionCompleta?: string | null; condicion?: string | null; estadoContribuyente?: string | null;
  paperSize: string; autoAceptarPedidos: boolean;
  usarFacturacionElectronica: boolean; sincronizadoFacturacion: boolean;
}

export interface UpdateEmpresaDto {
  nombre: string; ruc: string; direccion?: string | null; logoUrl?: string | null; activo: boolean;
  razonSocial?: string | null; nombreComercial?: string | null;
  departamento?: string | null; provincia?: string | null; distrito?: string | null;
  direccionCompleta?: string | null; condicion?: string | null; estadoContribuyente?: string | null;
  paperSize?: string | null; autoAceptarPedidos?: boolean | null;
  usarFacturacionElectronica?: boolean | null;
}

export function getMiEmpresa(token: string) {
  return apiFetch<EmpresaDto>('/api/empresas/mi-empresa', { token });
}

export function updateEmpresa(token: string, id: number, dto: UpdateEmpresaDto) {
  return apiFetch<EmpresaDto>(`/api/empresas/${id}`, { token, method: 'PUT', body: dto });
}
