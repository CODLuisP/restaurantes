export interface ProductoDto {
  id: number;
  empresaId: number;
  categoriaId: number;
  categoriaNombre: string;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
  createdAt: string;
  precio?: number;
  precioDelivery?: number;
  disponible?: boolean;
  controlaStock?: boolean;
  cantidadActual?: number;
  cantidadMinima?: number;
  unidad?: string;
  bajoMinimo?: boolean;
}

export interface CreateProductoDto {
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
}

export interface UpdateProductoDto {
  categoriaId: number;
  nombre: string;
  descripcion?: string;
  imagenUrl?: string;
}

export interface SetPrecioSucursalDto {
  precio?: number;
  precioDelivery?: number;
  disponible: boolean;
  controlaStock: boolean;
}

export interface ProductoSucursalDto {
  productoId: number;
  sucursalId: number;
  precio?: number;
  precioDelivery?: number;
  disponible: boolean;
  controlaStock: boolean;
  cantidadActual?: number;
  cantidadMinima?: number;
  unidad?: string;
}

export interface ProductoVarianteDto {
  id: number;
  productoId: number;
  nombre: string;
  precio: number;
  disponible: boolean;
}

export interface CreateProductoVarianteDto {
  productoId: number;
  nombre: string;
  precio: number;
}

export interface UpdateProductoVarianteDto {
  nombre: string;
  precio: number;
  disponible: boolean;
}
