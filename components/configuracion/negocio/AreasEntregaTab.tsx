'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  GoogleMap, Marker, Circle, Polygon, useJsApiLoader,
} from '@react-google-maps/api';
import {
  Map as MapIcon, Plus, Pencil, Trash2, Ban, X, Check, Undo2,
  Circle as CircleIcon, PenTool, Info, TriangleAlert,
} from 'lucide-react';
import { Input, Toggle, Select } from '@/components/ui';
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMapsLoader';
import { useApp } from '@/context/AppContext';
import { getSucursales } from '@/lib/api/sucursales';
import { getConfiguracion, updateUbicacion } from '@/lib/api/configuracion';
import {
  getZonasEntrega, createZonaEntrega, updateZonaEntrega, deleteZonaEntrega,
  addZonaExclusion, updateZonaExclusion, deleteZonaExclusion,
} from '@/lib/api/zonasEntrega';
import type { ZonaEntregaDto, UpsertZonaEntregaDto, ZoneShape } from '@/types/zonasEntrega';

export interface LatLng {
  lat: number;
  lng: number;
}

interface ZoneExclusion {
  id: number;
  center: LatLng;
  radiusKm: number;
}

interface DeliveryZone {
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

const ZONE_COLORS = ['#007542', '#0EA5E9', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];
const DEFAULT_RESTAURANT_LOCATION: LatLng = { lat: -12.0464, lng: -77.0428 };

function dtoToZone(d: ZonaEntregaDto): DeliveryZone {
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

function toUpsertDto(payload: Omit<DeliveryZone, 'id' | 'exclusions'>): UpsertZonaEntregaDto {
  return {
    nombre: payload.name, tipo: payload.type, activo: payload.active, color: payload.color,
    centerLat: payload.center?.lat ?? null, centerLng: payload.center?.lng ?? null,
    radiusKm: payload.radiusKm ?? null,
    path: payload.path ?? null,
    shippingCost: payload.shippingCost, freeOverAmount: payload.freeOverAmount, minOrderAmount: payload.minOrderAmount,
    etaMinutes: payload.etaMinutes,
  };
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_HEIGHT = 560;

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
function isPointInsideZone(point: LatLng, zone: DeliveryZone): boolean {
  if (zone.type === 'circulo' && zone.center && zone.radiusKm) {
    return distanceKm(point, zone.center) <= zone.radiusKm;
  }
  if (zone.type === 'poligono' && zone.path) {
    return isPointInPolygon(point, zone.path);
  }
  return false;
}

const money = (n: number) => `S/. ${n.toFixed(2)}`;

interface FormState {
  name: string;
  type: ZoneShape;
  radiusKm: string;
  shippingCost: string;
  freeOverAmount: string;
  minOrderAmount: string;
  etaMinutes: string;
  active: boolean;
}

const emptyForm = (): FormState => ({
  name: '', type: 'circulo', radiusKm: '3', shippingCost: '0',
  freeOverAmount: '', minOrderAmount: '', etaMinutes: '30', active: true,
});

export default function AreasEntregaTab() {
  const { data: session } = useSession();
  const { triggerToast } = useApp();
  const token = session?.accessToken;
  const isSuperAdmin = session?.user?.role === 'superadmin';

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [sucursales, setSucursales] = useState<{ id: number; nombre: string }[]>([]);
  const [sId, setSId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [restaurantLocation, setRestaurantLocationState] = useState<LatLng>(DEFAULT_RESTAURANT_LOCATION);
  const ubicacionDireccionRef = useRef<string | null>(null);
  const mostrarDireccionMenuRef = useRef(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [drawingPath, setDrawingPath] = useState<LatLng[] | null>(null);
  const [drawPoints, setDrawPoints] = useState<LatLng[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [addingExclusionFor, setAddingExclusionFor] = useState<number | null>(null);
  const [exclusionRadiusKm, setExclusionRadiusKm] = useState('1');
  const [exclusionOutsideError, setExclusionOutsideError] = useState(false);
  const exclusionCircleRefs = useRef(new Map<number, google.maps.Circle>());

  useEffect(() => {
    if (!token) return;
    getSucursales(token).then(lista => {
      const activas = lista.filter(s => s.activo);
      setSucursales(activas.map(s => ({ id: s.id, nombre: s.nombre })));
      const id = session?.user?.sucursalId ?? activas[0]?.id;
      if (id) { setSId(id); load(id); } else setCargando(false);
    }).catch(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const load = (id: number) => {
    if (!token) return;
    setCargando(true);
    Promise.all([getConfiguracion(token, id), getZonasEntrega(token, id)])
      .then(([config, zonasDto]) => {
        const loc = config.ubicacionLat != null && config.ubicacionLng != null
          ? { lat: Number(config.ubicacionLat), lng: Number(config.ubicacionLng) }
          : DEFAULT_RESTAURANT_LOCATION;
        setRestaurantLocationState(loc);
        ubicacionDireccionRef.current = config.ubicacionDireccion ?? null;
        mostrarDireccionMenuRef.current = !!config.mostrarDireccionMenu;
        setZones(zonasDto.map(dtoToZone));
      })
      .catch(() => triggerToast('Error al cargar las zonas de entrega.', 'error'))
      .finally(() => setCargando(false));
  };

  const setRestaurantLocation = async (loc: LatLng) => {
    setRestaurantLocationState(loc);
    if (!token || !sId) return;
    try {
      await updateUbicacion(token, sId, {
        ubicacionLat: loc.lat, ubicacionLng: loc.lng,
        ubicacionDireccion: ubicacionDireccionRef.current, mostrarDireccionMenu: mostrarDireccionMenuRef.current,
      });
    } catch { triggerToast('Error al guardar la ubicación del negocio.', 'error'); }
  };

  const addZone = async (payload: Omit<DeliveryZone, 'id' | 'exclusions'>) => {
    if (!token || !sId) return;
    try {
      const created = await createZonaEntrega(token, sId, toUpsertDto(payload));
      setZones(prev => [...prev, dtoToZone(created)]);
    } catch { triggerToast('Error al crear la zona.', 'error'); }
  };

  const updateZone = async (id: number, changes: Partial<DeliveryZone>) => {
    if (!token) return;
    const current = zones.find(z => z.id === id);
    if (!current) return;
    const merged = { ...current, ...changes };
    try {
      const updated = await updateZonaEntrega(token, id, toUpsertDto(merged));
      setZones(prev => prev.map(z => (z.id === id ? { ...dtoToZone(updated), exclusions: z.exclusions } : z)));
    } catch { triggerToast('Error al actualizar la zona.', 'error'); }
  };

  const removeZone = async (id: number) => {
    if (!token) return;
    try {
      await deleteZonaEntrega(token, id);
      setZones(prev => prev.filter(z => z.id !== id));
    } catch { triggerToast('Error al eliminar la zona.', 'error'); }
  };

  const addExclusion = async (zoneId: number, exclusion: { center: LatLng; radiusKm: number }) => {
    if (!token) return;
    try {
      const created = await addZonaExclusion(token, zoneId, {
        centerLat: exclusion.center.lat, centerLng: exclusion.center.lng, radiusKm: exclusion.radiusKm,
      });
      setZones(prev => prev.map(z => (z.id === zoneId
        ? { ...z, exclusions: [...z.exclusions, { id: created.id, center: { lat: created.centerLat, lng: created.centerLng }, radiusKm: created.radiusKm }] }
        : z)));
    } catch { triggerToast('Error al agregar la exclusión.', 'error'); }
  };

  const updateExclusion = async (zoneId: number, exclusionId: number, changes: Partial<ZoneExclusion>) => {
    if (!token) return;
    const zone = zones.find(z => z.id === zoneId);
    const current = zone?.exclusions.find(e => e.id === exclusionId);
    if (!current) return;
    const merged = { ...current, ...changes };
    try {
      const updated = await updateZonaExclusion(token, exclusionId, {
        centerLat: merged.center.lat, centerLng: merged.center.lng, radiusKm: merged.radiusKm,
      });
      setZones(prev => prev.map(z => (z.id === zoneId
        ? { ...z, exclusions: z.exclusions.map(e => (e.id === exclusionId ? { id: updated.id, center: { lat: updated.centerLat, lng: updated.centerLng }, radiusKm: updated.radiusKm } : e)) }
        : z)));
    } catch { triggerToast('Error al actualizar la exclusión.', 'error'); }
  };

  const removeExclusion = async (zoneId: number, exclusionId: number) => {
    if (!token) return;
    try {
      await deleteZonaExclusion(token, exclusionId);
      setZones(prev => prev.map(z => (z.id === zoneId ? { ...z, exclusions: z.exclusions.filter(e => e.id !== exclusionId) } : z)));
    } catch { triggerToast('Error al eliminar la exclusión.', 'error'); }
  };

  const nextColor = useMemo(() => ZONE_COLORS[zones.length % ZONE_COLORS.length], [zones.length]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDrawingPath(null);
    setDrawPoints([]);
    setShowForm(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setForm({
      name: zone.name,
      type: zone.type,
      radiusKm: String(zone.radiusKm ?? 3),
      shippingCost: String(zone.shippingCost),
      freeOverAmount: zone.freeOverAmount != null ? String(zone.freeOverAmount) : '',
      minOrderAmount: zone.minOrderAmount != null ? String(zone.minOrderAmount) : '',
      etaMinutes: String(zone.etaMinutes),
      active: zone.active,
    });
    setDrawingPath(zone.path ?? null);
    setDrawPoints([]);
    setSelectedZoneId(zone.id);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setDrawingPath(null);
    setDrawPoints([]);
  };

  const undoLastPoint = () => setDrawPoints(prev => prev.slice(0, -1));

  const finalizePolygon = () => {
    if (drawPoints.length < 3) return;
    setDrawingPath(drawPoints);
    setDrawPoints([]);
  };

  const restartPolygon = () => {
    setDrawingPath(null);
    setDrawPoints([]);
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) return;
    if (form.type === 'poligono' && (!drawingPath || drawingPath.length < 3)) return;

    const payload = {
      name,
      type: form.type,
      active: form.active,
      color: editingId ? (zones.find(z => z.id === editingId)?.color ?? nextColor) : nextColor,
      center: form.type === 'circulo' ? restaurantLocation : undefined,
      radiusKm: form.type === 'circulo' ? Number(form.radiusKm) || 0 : undefined,
      path: form.type === 'poligono' ? drawingPath ?? undefined : undefined,
      shippingCost: Number(form.shippingCost) || 0,
      freeOverAmount: form.freeOverAmount.trim() === '' ? null : Number(form.freeOverAmount),
      minOrderAmount: form.minOrderAmount.trim() === '' ? null : Number(form.minOrderAmount),
      etaMinutes: Number(form.etaMinutes) || 0,
    };

    if (editingId) updateZone(editingId, payload);
    else addZone(payload);
    closeForm();
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };

    if (addingExclusionFor) {
      const zone = zones.find(z => z.id === addingExclusionFor);
      if (!zone || !isPointInsideZone(point, zone)) {
        setExclusionOutsideError(true);
        return;
      }
      addExclusion(addingExclusionFor, { center: point, radiusKm: Number(exclusionRadiusKm) || 1 });
      setAddingExclusionFor(null);
      setExclusionOutsideError(false);
      return;
    }

    if (showForm && form.type === 'poligono' && !drawingPath) {
      setDrawPoints(prev => [...prev, point]);
    }
  };

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    setRestaurantLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  const handleExclusionDragEnd = (zone: DeliveryZone, exclusionId: number, e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    if (!isPointInsideZone(point, zone)) {
      // El arrastre nativo del mapa ya movió el círculo visualmente; como no vamos a
      // guardar esta posición, hay que devolverlo a mano a su centro original.
      const original = zone.exclusions.find(e2 => e2.id === exclusionId)?.center;
      const circle = exclusionCircleRefs.current.get(exclusionId);
      if (original && circle) circle.setCenter(original);
      return;
    }
    updateExclusion(zone.id, exclusionId, { center: point });
  };

  if (cargando) {
    return <div className="py-16 text-center text-xs text-slate-400">Cargando zonas de entrega...</div>;
  }

  return (
    <div className="space-y-5">
      {isSuperAdmin && sucursales.length > 0 && (
        <div className="flex justify-end">
          <Select value={sId ?? ''} onChange={e => { const id = Number(e.target.value); setSId(id); load(id); }}>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-brand p-2.5 rounded-xl shrink-0">
            <MapIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Zonas de Entrega</h4>
            <p className="text-xs text-slate-500">Cobertura y costos de envío</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva zona
        </button>
      </div>

      {addingExclusionFor && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-xs text-rose-700">
          <Ban className="h-4 w-4 shrink-0" />
          <span>
            {exclusionOutsideError
              ? 'Ese punto está fuera de la zona. Toca dentro del área verde/morada de la zona.'
              : 'Toca un punto del mapa para ubicar la zona de exclusión.'}
          </span>
          <label className="flex items-center gap-1.5 shrink-0">
            Radio
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={exclusionRadiusKm}
              onChange={e => setExclusionRadiusKm(e.target.value)}
              className="w-16 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs text-rose-700"
            />
            km
          </label>
          <button onClick={() => { setAddingExclusionFor(null); setExclusionOutsideError(false); }} className="ml-auto font-bold hover:underline shrink-0">Cancelar</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
        {/* ── Mapa ── */}
        <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ height: MAP_HEIGHT }}>
          {!GOOGLE_MAPS_API_KEY ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
              <div className="flex items-start gap-2.5 max-w-sm">
                <TriangleAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  Falta configurar <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
                  para activar el mapa interactivo.
                </p>
              </div>
            </div>
          ) : loadError ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
              <p className="text-[11px] text-rose-700 text-center max-w-sm">No se pudo cargar Google Maps. Verifica tu API key.</p>
            </div>
          ) : !isLoaded ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <p className="text-xs text-slate-400">Cargando mapa...</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={restaurantLocation}
              zoom={13}
              onClick={handleMapClick}
              options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
            >
              <Marker position={restaurantLocation} draggable onDragEnd={handleMarkerDragEnd} />

              {/* Zonas existentes */}
              {zones.map(zone => {
                const isSelected = selectedZoneId === zone.id;
                const shapeOpts = {
                  fillColor: zone.color,
                  fillOpacity: isSelected ? 0.32 : zone.active ? 0.16 : 0.06,
                  strokeColor: zone.color,
                  strokeWeight: isSelected ? 3 : 2,
                  strokeOpacity: zone.active ? 1 : 0.4,
                  // Mientras se ubica una exclusión, la forma no debe "atrapar" el click:
                  // tiene que dejarlo pasar al mapa para poder tocar puntos dentro de la zona.
                  clickable: !addingExclusionFor,
                };
                return (
                  <div key={zone.id}>
                    {zone.type === 'circulo' && zone.center && zone.radiusKm ? (
                      <Circle
                        center={zone.center}
                        radius={zone.radiusKm * 1000}
                        options={shapeOpts}
                        onClick={() => setSelectedZoneId(zone.id)}
                      />
                    ) : zone.type === 'poligono' && zone.path ? (
                      <Polygon path={zone.path} options={shapeOpts} onClick={() => setSelectedZoneId(zone.id)} />
                    ) : null}
                    {zone.exclusions.map(ex => (
                      <Circle
                        key={ex.id}
                        center={ex.center}
                        radius={ex.radiusKm * 1000}
                        draggable={!addingExclusionFor}
                        onDragEnd={e => handleExclusionDragEnd(zone, ex.id, e)}
                        onLoad={circle => exclusionCircleRefs.current.set(ex.id, circle)}
                        onUnmount={() => exclusionCircleRefs.current.delete(ex.id)}
                        options={{
                          fillColor: '#ef4444', fillOpacity: 0.28, strokeColor: '#ef4444', strokeWeight: 2,
                          clickable: !addingExclusionFor,
                        }}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Vista previa mientras se crea/edita */}
              {showForm && form.type === 'circulo' && (
                <Circle
                  center={restaurantLocation}
                  radius={(Number(form.radiusKm) || 0) * 1000}
                  options={{ fillColor: '#007542', fillOpacity: 0.12, strokeColor: '#007542', strokeWeight: 2, strokeOpacity: 0.8 }}
                />
              )}
              {showForm && form.type === 'poligono' && drawingPath && (
                <Polygon
                  path={drawingPath}
                  options={{ fillColor: '#007542', fillOpacity: 0.2, strokeColor: '#007542', strokeWeight: 2 }}
                />
              )}
              {showForm && form.type === 'poligono' && !drawingPath && drawPoints.length >= 2 && (
                <Polygon
                  path={drawPoints}
                  options={{ fillColor: '#007542', fillOpacity: 0.12, strokeColor: '#007542', strokeWeight: 2, strokeOpacity: 0.9, clickable: false }}
                />
              )}
              {showForm && form.type === 'poligono' && !drawingPath && drawPoints.map((p, i) => (
                <Marker
                  key={i}
                  position={p}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 6,
                    fillColor: '#007542',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                />
              ))}
            </GoogleMap>
          )}
        </div>

        {/* ── Panel lateral ── */}
        <div className="space-y-4">
          {showForm && (
            <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  {editingId ? 'Editar zona' : 'Nueva zona'}
                </h5>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de zona</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: 'circulo' }))}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                      form.type === 'circulo' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CircleIcon className="h-3.5 w-3.5" /> Círculo (radio)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, type: 'poligono' })); restartPolygon(); }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                      form.type === 'poligono' ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <PenTool className="h-3.5 w-3.5" /> Polígono (dibujar)
                  </button>
                </div>
              </div>

              <Input
                label="Nombre *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Zona Centro"
              />

              {form.type === 'circulo' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Radio (km) *"
                    type="number" min={0.5} step={0.5}
                    value={form.radiusKm}
                    onChange={e => setForm(f => ({ ...f, radiusKm: e.target.value }))}
                  />
                  <Input
                    label="Costo envío (S/.) *"
                    type="number" min={0} step={0.5}
                    value={form.shippingCost}
                    onChange={e => setForm(f => ({ ...f, shippingCost: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`rounded-xl border px-3 py-2.5 text-[11px] flex items-center gap-2 ${
                    drawingPath ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                  }`}>
                    {drawingPath ? <Check className="h-3.5 w-3.5 shrink-0" /> : <PenTool className="h-3.5 w-3.5 shrink-0" />}
                    {drawingPath
                      ? `Área dibujada (${drawingPath.length} puntos). `
                      : `Haz clic en el mapa para marcar los vértices (${drawPoints.length}, mínimo 3). `}
                    {drawingPath && (
                      <button onClick={restartPolygon} className="font-bold hover:underline shrink-0">Rehacer</button>
                    )}
                  </div>

                  {!drawingPath && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={undoLastPoint}
                        disabled={drawPoints.length === 0}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Undo2 className="h-3.5 w-3.5" /> Deshacer punto
                      </button>
                      <button
                        type="button"
                        onClick={finalizePolygon}
                        disabled={drawPoints.length < 3}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold bg-brand hover:bg-brand-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="h-3.5 w-3.5" /> Finalizar polígono
                      </button>
                    </div>
                  )}

                  <Input
                    label="Costo envío (S/.) *"
                    type="number" min={0} step={0.5}
                    value={form.shippingCost}
                    onChange={e => setForm(f => ({ ...f, shippingCost: e.target.value }))}
                  />
                </div>
              )}

              <Input
                label="Envío gratis sobre (S/.)"
                type="number" min={0} step={1}
                value={form.freeOverAmount}
                onChange={e => setForm(f => ({ ...f, freeOverAmount: e.target.value }))}
                placeholder="Vacío = no aplica"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Pedido mínimo (S/.)"
                  type="number" min={0} step={1}
                  value={form.minOrderAmount}
                  onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                  placeholder="Sin mínimo"
                />
                <Input
                  label="Tiempo estimado (min) *"
                  type="number" min={1} step={5}
                  value={form.etaMinutes}
                  onChange={e => setForm(f => ({ ...f, etaMinutes: e.target.value }))}
                />
              </div>

              <Toggle checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} label="Zona activa" />

              <div className="flex gap-2 pt-1">
                <button onClick={closeForm} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim() || (form.type === 'poligono' && !drawingPath)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-3.5 w-3.5" /> {editingId ? 'Guardar cambios' : 'Crear zona'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de zonas */}
          {zones.length === 0 && !showForm ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center space-y-2">
              <MapIcon className="h-7 w-7 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Aún no tienes zonas de entrega.</p>
              <button onClick={openCreate} className="text-xs font-bold text-brand hover:underline">Crear la primera zona →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map(zone => (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-colors ${
                    selectedZoneId === zone.id ? 'border-brand/50 bg-brand/5' : 'border-slate-200 bg-white hover:bg-slate-50'
                  } ${!zone.active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                      <span className="text-sm font-bold text-slate-800 truncate">{zone.name}</span>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {zone.type === 'circulo' ? 'Círculo' : 'Polígono'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEdit(zone); }} className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-brand/10">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeZone(zone.id); if (selectedZoneId === zone.id) setSelectedZoneId(null); }} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-600">
                    {zone.type === 'circulo' && <span className="font-semibold">{zone.radiusKm} km</span>}
                    <span>Envío <strong className="text-slate-800">{money(zone.shippingCost)}</strong></span>
                    {zone.freeOverAmount != null && (
                      <span className="text-emerald-600 font-semibold">Gratis +{money(zone.freeOverAmount)}</span>
                    )}
                    <span>~{zone.etaMinutes} min</span>
                    {zone.minOrderAmount != null && <span>Mín. {money(zone.minOrderAmount)}</span>}
                  </div>

                  {/* Exclusiones */}
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Zonas de exclusión</p>
                    {zone.exclusions.length > 0 && (
                      <div className="space-y-1 mb-1.5">
                        {zone.exclusions.map(ex => (
                          <div key={ex.id} className="flex items-center justify-between bg-rose-50 rounded-lg px-2.5 py-1.5 text-[11px] text-rose-700">
                            <span className="flex items-center gap-1.5"><Ban className="h-3 w-3" /> Exclusión · {ex.radiusKm} km</span>
                            <button onClick={e => { e.stopPropagation(); removeExclusion(zone.id, ex.id); }} className="text-rose-400 hover:text-rose-600">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedZoneId(zone.id); setAddingExclusionFor(zone.id); setExclusionRadiusKm('1'); setExclusionOutsideError(false); }}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-rose-500 border border-dashed border-rose-200 hover:bg-rose-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Ban className="h-3.5 w-3.5" /> Agregar zona de exclusión
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Info className="h-3.5 w-3.5 text-slate-400" /> ¿Cómo funcionan las zonas?
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <CircleIcon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[11px] text-slate-600 pt-1">
                  <strong className="text-slate-800">Círculo:</strong> cobertura por radio desde el restaurante.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                  <PenTool className="h-3.5 w-3.5" />
                </span>
                <p className="text-[11px] text-slate-600 pt-1">
                  <strong className="text-slate-800">Polígono:</strong> área libre dibujada en el mapa.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban className="h-3.5 w-3.5" />
                </span>
                <p className="text-[11px] text-slate-600 pt-1">
                  <strong className="text-slate-800">Exclusiones</strong> en rojo: áreas donde no se entrega aunque estén dentro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
