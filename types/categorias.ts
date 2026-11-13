/** Dónde se imprime la comanda de los productos de la categoría. */
export type AreaCategoria = 'cocina' | 'barra' | 'ninguna';

export interface CategoriaDto {
  id: number;
  empresaId: number;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  area: AreaCategoria;
}

export interface CreateCategoriaDto {
  nombre: string;
  descripcion?: string;
  orden: number;
  area?: AreaCategoria;
}

export interface UpdateCategoriaDto {
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  area?: AreaCategoria;
}
