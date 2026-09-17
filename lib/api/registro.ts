import { apiFetch } from './client';

export interface RegistroDto {
  nombreEmpresa: string;
  ruc: string;
  direccion?: string;
  razonSocial?: string;
  nombreComercial?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccionCompleta?: string;
  condicion?: string;
  estadoContribuyente?: string;
  nombreAdmin: string;
  email?: string;
  username: string;
  password: string;
}

export interface RegistroResultDto {
  empresaId: number;
  empresaNombre: string;
  sucursalId: number;
  usernameAdmin: string;
  usernameSuperAdmin: string;
}

/** Alta pública de una empresa nueva (página /registro, sin login) — crea empresa, sucursal
 *  "Principal", el usuario admin elegido y un superadmin derivado. Ver RegistroService (backend). */
export function registrarEmpresa(dto: RegistroDto) {
  return apiFetch<RegistroResultDto>('/api/registro', { method: 'POST', body: dto });
}
