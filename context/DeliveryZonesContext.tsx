'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ZoneShape = 'circulo' | 'poligono';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Zona circular simple usada para excluir un área dentro de una zona de entrega. */
export interface ZoneExclusion {
  id: string;
  center: LatLng;
  radiusKm: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  type: ZoneShape;
  active: boolean;
  color: string;

  /** Solo para type === 'circulo'. */
  center?: LatLng;
  radiusKm?: number;

  /** Solo para type === 'poligono'. */
  path?: LatLng[];

  /** Costo de envío para pedidos dentro de la zona. */
  shippingCost: number;
  /** Monto a partir del cual el envío es gratis. Vacío = no aplica. */
  freeOverAmount: number | null;
  /** Pedido mínimo para poder pedir delivery en esta zona. Vacío = sin mínimo. */
  minOrderAmount: number | null;
  /** Tiempo estimado de entrega, en minutos. */
  etaMinutes: number;

  exclusions: ZoneExclusion[];
}

export const DELIVERY_ZONES_STORAGE_KEY = 'restopro_delivery_zones_v1';
const STORAGE_KEY = DELIVERY_ZONES_STORAGE_KEY;

/** Ubicación por defecto del local (Lima, Perú) mientras no haya una guardada. */
export const DEFAULT_RESTAURANT_LOCATION: LatLng = { lat: -12.0464, lng: -77.0428 };

export const ZONE_COLORS = ['#007542', '#0EA5E9', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];

interface DeliveryZonesContextType {
  zones: DeliveryZone[];
  restaurantLocation: LatLng;
  setRestaurantLocation: (loc: LatLng) => void;
  addZone: (zone: Omit<DeliveryZone, 'id' | 'exclusions'>) => void;
  updateZone: (id: string, changes: Partial<DeliveryZone>) => void;
  removeZone: (id: string) => void;
  addExclusion: (zoneId: string, exclusion: Omit<ZoneExclusion, 'id'>) => void;
  updateExclusion: (zoneId: string, exclusionId: string, changes: Partial<ZoneExclusion>) => void;
  removeExclusion: (zoneId: string, exclusionId: string) => void;
}

const DeliveryZonesContext = createContext<DeliveryZonesContextType | null>(null);

interface StoredState {
  zones: DeliveryZone[];
  restaurantLocation: LatLng;
}

export function DeliveryZonesProvider({ children }: { children: React.ReactNode }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [restaurantLocation, setRestaurantLocationState] = useState<LatLng>(DEFAULT_RESTAURANT_LOCATION);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        if (Array.isArray(parsed.zones)) setZones(parsed.zones);
        if (parsed.restaurantLocation) setRestaurantLocationState(parsed.restaurantLocation);
      }
    } catch {}
  }, []);

  const persist = useCallback((nextZones: DeliveryZone[], nextLocation: LatLng) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ zones: nextZones, restaurantLocation: nextLocation })); } catch {}
  }, []);

  const setRestaurantLocation = useCallback((loc: LatLng) => {
    setRestaurantLocationState(loc);
    persist(zones, loc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  const addZone = useCallback((zone: Omit<DeliveryZone, 'id' | 'exclusions'>) => {
    setZones(prev => {
      const next = [...prev, { ...zone, id: `zone-${Date.now().toString(36)}`, exclusions: [] }];
      persist(next, restaurantLocation);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantLocation]);

  const updateZone = useCallback((id: string, changes: Partial<DeliveryZone>) => {
    setZones(prev => {
      const next = prev.map(z => (z.id === id ? { ...z, ...changes } : z));
      persist(next, restaurantLocation);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantLocation]);

  const removeZone = useCallback((id: string) => {
    setZones(prev => {
      const next = prev.filter(z => z.id !== id);
      persist(next, restaurantLocation);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantLocation]);

  const addExclusion = useCallback((zoneId: string, exclusion: Omit<ZoneExclusion, 'id'>) => {
    setZones(prev => {
      const next = prev.map(z =>
        z.id === zoneId
          ? { ...z, exclusions: [...z.exclusions, { ...exclusion, id: `excl-${Date.now().toString(36)}` }] }
          : z
      );
      persist(next, restaurantLocation);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantLocation]);

  const updateExclusion = useCallback((zoneId: string, exclusionId: string, changes: Partial<ZoneExclusion>) => {
    setZones(prev => {
      const next = prev.map(z =>
        z.id === zoneId
          ? { ...z, exclusions: z.exclusions.map(e => (e.id === exclusionId ? { ...e, ...changes } : e)) }
          : z
      );
      persist(next, restaurantLocation);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantLocation]);

  const removeExclusion = useCallback((zoneId: string, exclusionId: string) => {
    setZones(prev => {
      const next = prev.map(z =>
        z.id === zoneId ? { ...z, exclusions: z.exclusions.filter(e => e.id !== exclusionId) } : z
      );
      persist(next, restaurantLocation);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantLocation]);

  return (
    <DeliveryZonesContext.Provider
      value={{
        zones, restaurantLocation, setRestaurantLocation,
        addZone, updateZone, removeZone,
        addExclusion, updateExclusion, removeExclusion,
      }}
    >
      {children}
    </DeliveryZonesContext.Provider>
  );
}

export function useDeliveryZones() {
  const ctx = useContext(DeliveryZonesContext);
  if (!ctx) throw new Error('useDeliveryZones must be used within DeliveryZonesProvider');
  return ctx;
}
