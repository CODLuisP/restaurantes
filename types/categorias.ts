export interface CategoriaDto {
  id: number;
  empresaId: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface CreateCategoriaDto {
  nombre: string;
  descripcion?: string;
  orden: number;
}

export interface UpdateCategoriaDto {
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}
