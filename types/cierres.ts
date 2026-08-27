export interface CierreDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  motivo: string;
  desde: string;
  hasta: string;
}

export interface CreateCierreDto {
  motivo: string;
  desde: string;
  hasta: string;
}
