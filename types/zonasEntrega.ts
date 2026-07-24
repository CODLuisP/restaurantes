export type ZoneShape = 'circulo' | 'poligono';

export interface LatLngDto {
  lat: number;
  lng: number;
}

export interface ZonaExclusionDto {
  id: number;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export interface ZonaEntregaDto {
  id: number;
  sucursalId: number;
  nombre: string;
  tipo: ZoneShape;
  activo: boolean;
  color: string;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusKm?: number | null;
  path?: LatLngDto[] | null;
  shippingCost: number;
  freeOverAmount?: number | null;
  minOrderAmount?: number | null;
  etaMinutes: number;
  exclusions: ZonaExclusionDto[];
}

export interface UpsertZonaEntregaDto {
  nombre: string;
  tipo: ZoneShape;
  activo: boolean;
  color: string;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusKm?: number | null;
  path?: LatLngDto[] | null;
  shippingCost: number;
  freeOverAmount?: number | null;
  minOrderAmount?: number | null;
  etaMinutes: number;
}

export interface UpsertExclusionDto {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}
