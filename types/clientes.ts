// ── Entidades ────────────────────────────────────────────────

export interface ClienteDireccion {
  id: number;
  clienteId: number;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  ubigeo?: string;
  tipo: 'fiscal' | 'entrega' | 'ambos';
  activo: boolean;
}

export type NivelCliente = 'NUEVO' | 'OCASIONAL' | 'FRECUENTE' | 'FIEL' | 'VIP';

export type TipoDocumento = 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';

export interface Cliente {
  id: number;
  empresaId: number;
  nombre: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;
  nivel: NivelCliente;
  totalGastado: number;
  ultimoPedido?: string;
  fechaRegistro: string;
  estado: boolean;
  notas?: string;
  direcciones: ClienteDireccion[];
}

// ── DTOs de entrada ──────────────────────────────────────────

export interface CreateClienteDireccionDto {
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  ubigeo?: string;
  tipo: 'fiscal' | 'entrega' | 'ambos';
}

export interface UpdateClienteDireccionDto extends CreateClienteDireccionDto {
  activo: boolean;
}

export interface CreateClienteDto {
  nombre: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;
  nivel: NivelCliente;
  notas?: string;
  direcciones: CreateClienteDireccionDto[];
}

export interface UpdateClienteDto {
  nombre: string;
  tipoDocumento?: TipoDocumento;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;
  nivel: NivelCliente;
  notas?: string;
  estado: boolean;
}

export interface ImportarClientesDto {
  clientes: CreateClienteDto[];
}

export interface ImportarResultadoDto {
  importados: number;
  errores: number;
  detalle: string[];
}
