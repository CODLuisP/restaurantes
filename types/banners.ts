export interface BannerDto {
  id: number;
  empresaId: number;
  sucursalId: number;
  titulo: string;
  imagenUrl: string;
  gradient?: string | null;
  activo: boolean;
  programacionHoraria: boolean;
  dias: string[];
}

export interface CreateBannerDto {
  titulo: string;
  imagenUrl: string;
  gradient?: string | null;
  activo: boolean;
  programacionHoraria: boolean;
  dias: string[];
}

export interface UpdateBannerDto {
  titulo: string;
  imagenUrl: string;
  gradient?: string | null;
  activo: boolean;
  programacionHoraria: boolean;
  dias: string[];
}

export interface ReorderBannersDto {
  orderedIds: number[];
}
