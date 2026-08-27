import type { ZonaEntregaDto, UpsertZonaEntregaDto, ZoneShape } from '@/types/zonasEntrega';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ZoneExclusion {
  id: number;
  center: LatLng;
  radiusKm: number;
}

export interface DeliveryZone {
  id: number;
  name: string;
  type: ZoneShape;
  active: boolean;
  color: string;
  center?: LatLng;
  radiusKm?: number;
  path?: LatLng[];
  shippingCost: number;
  freeOverAmount: number | null;
  minOrderAmount: number | null;
  etaMinutes: number;
  exclusions: ZoneExclusion[];
}

export interface FormState {
  name: string;
  type: ZoneShape;
  radiusKm: string;
  shippingCost: string;
  freeOverAmount: string;
  minOrderAmount: string;
  etaMinutes: string;
  active: boolean;
}

export const ZONE_COLORS = ['#007542', '#0EA5E9', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];
export const DEFAULT_RESTAURANT_LOCATION: LatLng = { lat: -12.0464, lng: -77.0428 };

export const emptyForm = (): FormState => ({
  name: '', type: 'circulo', radiusKm: '3', shippingCost: '0',
  freeOverAmount: '', minOrderAmount: '', etaMinutes: '30', active: true,
});

export const money = (n: number) => `S/. ${n.toFixed(2)}`;

export function dtoToZone(d: ZonaEntregaDto): DeliveryZone {
  return {
    id: d.id, name: d.nombre, type: d.tipo, active: d.activo, color: d.color,
    center: d.centerLat != null && d.centerLng != null ? { lat: d.centerLat, lng: d.centerLng } : undefined,
    radiusKm: d.radiusKm ?? undefined,
    path: d.path?.map(p => ({ lat: p.lat, lng: p.lng })),
    shippingCost: d.shippingCost, freeOverAmount: d.freeOverAmount ?? null, minOrderAmount: d.minOrderAmount ?? null,
    etaMinutes: d.etaMinutes,
    exclusions: d.exclusions.map(e => ({ id: e.id, center: { lat: e.centerLat, lng: e.centerLng }, radiusKm: e.radiusKm })),
  };
}

export function toUpsertDto(payload: Omit<DeliveryZone, 'id' | 'exclusions'>): UpsertZonaEntregaDto {
  return {
    nombre: payload.name, tipo: payload.type, activo: payload.active, color: payload.color,
    centerLat: payload.center?.lat ?? null, centerLng: payload.center?.lng ?? null,
    radiusKm: payload.radiusKm ?? null,
    path: payload.path ?? null,
    shippingCost: payload.shippingCost, freeOverAmount: payload.freeOverAmount, minOrderAmount: payload.minOrderAmount,
    etaMinutes: payload.etaMinutes,
  };
}

/** Distancia en km entre dos coordenadas (fórmula haversine). */
function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const lat1 = a.lat * (Math.PI / 180);
  const lat2 = b.lat * (Math.PI / 180);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** true si el punto está dentro del polígono (ray casting). */
function isPointInPolygon(point: LatLng, path: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
    const xi = path[i].lng, yi = path[i].lat;
    const xj = path[j].lng, yj = path[j].lat;
    const intersect = (yi > point.lat) !== (yj > point.lat)
      && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** true si el punto cae dentro del área de cobertura de la zona (círculo o polígono). */
export function isPointInsideZone(point: LatLng, zone: DeliveryZone): boolean {
  if (zone.type === 'circulo' && zone.center && zone.radiusKm) {
    return distanceKm(point, zone.center) <= zone.radiusKm;
  }
  if (zone.type === 'poligono' && zone.path) {
    return isPointInPolygon(point, zone.path);
  }
  return false;
}
